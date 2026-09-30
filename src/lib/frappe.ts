import { messages } from "@/i18n";
import axios, { type AxiosRequestConfig } from "axios";
import type { BaseDoc, Doc, DocValue } from "./types";
import { parseDocHistory, type DocHistory, type RawDocInfo } from "./history";
import {
  mockGetDocInfo,
  mockGetList,
  mockGetCount,
  mockGetDoc,
  mockCreateDoc,
  mockUpdateDoc,
  mockDeleteDoc,
  mockCall,
  mockUpload,
  mockAttach,
  setMockUser,
} from "./mockData";

/**
 * TEMPORARY: serve every read and write from src/lib/mockData.ts instead of Frappe,
 * so the UI can be built while login is switched off and there is no session cookie.
 * Set this to false to talk to the real backend again.
 */
export const MOCK_DATA: boolean = true;

/** A Frappe filter row: [field, operator, value], e.g. ["status", "=", "Planned"]. */
export type FilterRow = [string, string, unknown];
export type Filters = FilterRow[] | Record<string, unknown>;

export interface ListOptions {
  filters?: Filters;
  /** Rows match if ANY of these match. Used for search boxes. */
  orFilters?: FilterRow[];
  /** e.g. "appointment_date desc, appointment_time desc" */
  orderBy?: string;
  /** Rows per call. 0 means no limit. Default 100. */
  limit?: number;
  /** Rows to skip, for paging. */
  start?: number;
}

type DocData = Record<string, DocValue>;

/** How long a request may take before it counts as failed. Uploads and whole-table reads get longer. */
export const REQUEST_TIMEOUT_MS = 15_000;
/** A big X-ray or a phone photo on a slow clinic connection can take minutes, so uploads get 10 minutes. */
export const UPLOAD_TIMEOUT_MS = 10 * 60_000;
const FULL_LIST_TIMEOUT_MS = 60_000;

const api = axios.create({
  baseURL: "",
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    "Expect": "",
  },
});

const resource = (doctype: string, name?: string) =>
  `/frappe/api/resource/${encodeURIComponent(doctype)}` + (name ? `/${encodeURIComponent(name)}` : "");

/* ------------------------------------------------------------------------------------------------------
   An ended login. Frappe answers a request from an expired session with 403 (as user "Guest"), the same
   code as a real "no permission". So on a 401 or 403 we ask Frappe who is logged in, once for a whole
   burst of failed requests, and only call it "session ended" when the answer is Guest.
   ------------------------------------------------------------------------------------------------------ */

/** "Your session has ended. Please log in again." in the current language. */
export const sessionEndedMessage = () => messages().errors.sessionEnded;

/** Thrown instead of the 401/403 when the login has ended. errorMessage() shows its sentence. */
export class SessionEndedError extends Error {
  constructor() {
    super(sessionEndedMessage());
    this.name = "SessionEndedError";
  }
}

const LOGGED_USER_METHOD = "/frappe/api/method/frappe.auth.get_logged_user";
const AUTH_CALLS = ["/api/method/login", "/api/method/logout", "frappe.auth.get_logged_user"];
const sessionListeners = new Set<() => void>();
const restoredListeners = new Set<() => void>();
let sessionEndReported = false;
let sessionProbe: Promise<boolean> | null = null;

/** Runs `listener` once each time the login ends (AuthContext uses it to ask for the password again). */
export function onSessionEnded(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

/** Runs `listener` when requests work again after an ended login (for example after logging in in another tab). */
export function onSessionRestored(listener: () => void): () => void {
  restoredListeners.add(listener);
  return () => {
    restoredListeners.delete(listener);
  };
}

/** The user Frappe says is logged in, or null for Guest. */
export async function getLoggedUser(): Promise<string | null> {
  const res = await api.get(LOGGED_USER_METHOD);
  const user = res.data?.message;
  return typeof user === "string" && user && user !== "Guest" ? user : null;
}

/** True when Frappe no longer knows us. Parallel callers share one question. */
function sessionIsGone(): Promise<boolean> {
  if (!sessionProbe) {
    sessionProbe = getLoggedUser()
      .then((user) => !user)
      .catch((err) => {
        // Being refused the question itself means nobody is logged in.
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        return status === 401 || status === 403;
      })
      .finally(() => {
        sessionProbe = null;
      });
  }
  return sessionProbe;
}

api.interceptors.response.use(
  (response) => {
    // Any answer means the session works (again), so a later end is reported afresh.
    if (sessionEndReported) {
      sessionEndReported = false;
      restoredListeners.forEach((listener) => listener());
    }
    return response;
  },
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const url = error.config?.url ?? "";
      if ((status === 401 || status === 403) && !AUTH_CALLS.some((call) => url.includes(call)) && (await sessionIsGone())) {
        if (!sessionEndReported) {
          sessionEndReported = true;
          sessionListeners.forEach((listener) => listener());
        }
        throw new SessionEndedError();
      }
    }
    throw error;
  },
);

/**
 * True when the Frappe server itself did not answer: the Next.js rewrite then replies 502/503/504, or 500
 * with a plain page instead of Frappe's JSON. (A real Frappe error is JSON with exc_type or exception.)
 */
export function isServerDown(err: unknown): boolean {
  if (!axios.isAxiosError(err) || !err.response) return false;
  const { status, data } = err.response;
  if (status === 502 || status === 503 || status === 504) return true;
  const frappeError =
    typeof data === "object" && data !== null && ("exc_type" in data || "exception" in data || "_server_messages" in data);
  return status === 500 && !frappeError;
}

/**
 * A failed read worth sending again: no answer came back (not a refusal, a timeout or an ended login), or
 * the server was down.
 */
export function isRetriableReadError(err: unknown): boolean {
  if (!axios.isAxiosError(err) || axios.isCancel(err)) return false;
  if (err.response) return isServerDown(err);
  return err.code !== "ECONNABORTED" && err.code !== "ETIMEDOUT";
}

/** Runs a read, and runs it again up to twice (after 0.5 s, then 1 s) when no answer came back. Never used for saves. */
export async function withReadRetry<T>(read: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await read();
    } catch (err) {
      if (attempt >= retries || !isRetriableReadError(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs * 2 ** attempt));
    }
  }
}

export const initAuth = () => {
  const csrf = localStorage.getItem("csrf_token");
  if (csrf) {
    api.defaults.headers.common["x-frappe-csrf-token"] = csrf;
  }
};

export const loginNotKeptMessage = () => messages().errors.loginNotKept;
export const twoFactorMessage = () => messages().errors.twoFactor;
export const passwordResetMessage = () => messages().errors.passwordReset;

/**
 * Logs in and returns the user ID Frappe knows (an email, or "Administrator"), which may differ from what
 * was typed. It then asks Frappe who is logged in, so a session cookie the browser did not keep is caught
 * here instead of on the first save.
 */
export const login = async (usr: string, pwd: string): Promise<string> => {
  const res = await api.post("/frappe/api/method/login", { usr, pwd });
  const csrf = res.headers["x-frappe-csrf-token"];
  if (csrf) {
    api.defaults.headers.common["x-frappe-csrf-token"] = csrf;
    localStorage.setItem("csrf_token", csrf);
  }
  // Two-factor login answers with a verification step instead of a session.
  if (res.data?.verification || res.data?.tmp_id) throw new Error(twoFactorMessage());
  // An expired password answers with a link to the password page instead of a session.
  if (res.data?.message === "Password Reset" || String(res.data?.redirect_to ?? "").includes("update-password"))
    throw new Error(passwordResetMessage());
  const user = await getLoggedUser().catch((err: unknown) => {
    // Refused means Frappe sees a guest; any other failure (timeout, server down) is explained as it is.
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (status === 401 || status === 403) return null;
    throw err;
  });
  if (!user) throw new Error(loginNotKeptMessage());
  sessionEndReported = false;
  return user;
};

export const logout = async () => {
  await api.get("/frappe/api/method/logout");
  localStorage.removeItem("csrf_token");
  localStorage.removeItem("dental_user");
};

export async function getList<T extends BaseDoc = Doc>(
  doctype: string,
  fields: string[],
  options: ListOptions = {},
): Promise<T[]> {
  const { filters, orFilters, orderBy, limit = 100, start = 0 } = options;
  if (MOCK_DATA) {
    const rows = await mockGetList(doctype, fields, { filters, orFilters, orderBy, limit, start });
    return rows as unknown as T[];
  }
  initAuth();
  const res = await withReadRetry(() =>
    api.get(resource(doctype), {
      // Loading every row (limit 0, for totals) can take longer than a page of rows.
      timeout: limit === 0 ? FULL_LIST_TIMEOUT_MS : REQUEST_TIMEOUT_MS,
      params: {
        fields: JSON.stringify(fields),
        filters: filters ? JSON.stringify(filters) : undefined,
        or_filters: orFilters?.length ? JSON.stringify(orFilters) : undefined,
        order_by: orderBy,
        limit_start: start,
        limit_page_length: limit,
      },
    }),
  );
  return res.data.data;
}

/** How many docs match. Used for paging and dashboard counts. */
export async function getCount(doctype: string, filters?: Filters, orFilters?: FilterRow[]): Promise<number> {
  if (MOCK_DATA) return mockGetCount(doctype, filters, orFilters);
  initAuth();
  if (orFilters?.length) {
    // frappe.client.get_count has no or_filters, so searches use the list view's count method.
    const res = await withReadRetry(() =>
      api.get("/frappe/api/method/frappe.desk.reportview.get_count", {
        params: {
          doctype,
          fields: JSON.stringify(["name"]),
          filters: JSON.stringify(filters ?? []),
          or_filters: JSON.stringify(orFilters),
          distinct: 0,
        },
      }),
    );
    return Number(res.data.message) || 0;
  }
  const res = await withReadRetry(() =>
    api.get("/frappe/api/method/frappe.client.get_count", {
      params: { doctype, filters: JSON.stringify(filters ?? []) },
    }),
  );
  return Number(res.data.message) || 0;
}

export async function getDoc<T extends BaseDoc = Doc>(doctype: string, name: string): Promise<T> {
  if (MOCK_DATA) return (await mockGetDoc(doctype, name)) as unknown as T;
  initAuth();
  const res = await withReadRetry(() => api.get(resource(doctype, name)));
  return res.data.data;
}

/**
 * Who created a record and who changed what, and when (the last 10 changes). Frappe's getdoc returns the document
 * with its Version records and the names of the users involved; the doctype needs Track Changes turned on.
 */
export async function getDocHistory(doctype: string, name: string): Promise<DocHistory> {
  let doc: { owner?: string; creation?: string } | undefined;
  let docinfo: RawDocInfo | undefined;
  if (MOCK_DATA) {
    const raw = await mockGetDocInfo(doctype, name);
    doc = raw.docs[0] as { owner?: string; creation?: string };
    docinfo = raw.docinfo as unknown as RawDocInfo;
  } else {
    initAuth();
    const res = await withReadRetry(() =>
      api.get("/frappe/api/method/frappe.desk.form.load.getdoc", { params: { doctype, name } }),
    );
    const data = res.data as { docs?: Array<{ owner?: string; creation?: string }>; docinfo?: RawDocInfo };
    doc = data.docs?.[0];
    docinfo = data.docinfo;
  }
  return parseDocHistory(doc, docinfo);
}

/**
 * Tells the data layer who is logged in. Only the dummy data uses it (to record who made each change); the real
 * server knows from the session.
 */
export function setSessionUser(user: string | null): void {
  if (MOCK_DATA) setMockUser(user);
}

export async function createDoc<T extends BaseDoc = Doc>(doctype: string, data: object): Promise<T> {
  if (MOCK_DATA) return (await mockCreateDoc(doctype, data as DocData)) as unknown as T;
  initAuth();
  const res = await api.post(resource(doctype), data);
  return res.data.data;
}

export async function updateDoc<T extends BaseDoc = Doc>(doctype: string, name: string, data: object): Promise<T> {
  if (MOCK_DATA) return (await mockUpdateDoc(doctype, name, data as DocData)) as unknown as T;
  initAuth();
  const res = await api.put(resource(doctype, name), data);
  return res.data.data;
}

export async function deleteDoc(doctype: string, name: string): Promise<void> {
  if (MOCK_DATA) return mockDeleteDoc(doctype, name);
  initAuth();
  await api.delete(resource(doctype, name));
}

/** Calls a whitelisted Frappe method and returns its `message`. */
export async function callMethod<T = unknown>(method: string, args: object = {}): Promise<T> {
  if (MOCK_DATA) return (await mockCall(method, args as DocData)) as T;
  initAuth();
  const res = await api.post(`/frappe/api/method/${method}`, args);
  return res.data.message;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await callMethod("frappe.core.doctype.user.user.update_password", {
    old_password: oldPassword,
    new_password: newPassword,
  });
}

export interface UploadOptions {
  /** Called while the file goes out, with how much of it has been sent (0 to 1). */
  onProgress?: (fraction: number) => void;
}

/** The request settings every upload shares: multipart, the long time limit and progress reports. */
export function uploadRequestConfig({ onProgress }: UploadOptions = {}): AxiosRequestConfig {
  return {
    // The instance default is JSON; multipart lets the browser set the boundary.
    headers: { "Content-Type": "multipart/form-data" },
    timeout: UPLOAD_TIMEOUT_MS,
    onUploadProgress: onProgress
      ? (event) => {
          if (event.total) onProgress(Math.min(1, event.loaded / event.total));
        }
      : undefined,
  };
}

/** Uploads a file (e.g. the clinic logo) and returns its URL. */
export async function uploadFile(file: File, options: UploadOptions = {}): Promise<string> {
  if (MOCK_DATA) return mockUpload(file, options.onProgress);
  initAuth();
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("is_private", "0");
  form.append("folder", "Home");
  const res = await api.post("/frappe/api/method/upload_file", form, uploadRequestConfig(options));
  return res.data.message.file_url;
}

/** A File record, as attachFile() returns it and getList("File", …) lists it. */
export interface FileDoc {
  name: string;
  file_name: string;
  file_url: string;
  is_private?: number;
  attached_to_doctype?: string;
  attached_to_name?: string;
  creation?: string;
}

/**
 * Uploads a file attached to a record (e.g. an X-ray on a Patient). Medical files are private, so only
 * logged-in staff can open them. Returns the new File record.
 */
export async function attachFile(file: File, doctype: string, name: string, options: UploadOptions = {}): Promise<FileDoc> {
  if (MOCK_DATA) return (await mockAttach(file, doctype, name, options.onProgress)) as unknown as FileDoc;
  initAuth();
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("is_private", "1");
  form.append("doctype", doctype);
  form.append("docname", name);
  form.append("folder", "Home/Attachments");
  const res = await api.post("/frappe/api/method/upload_file", form, uploadRequestConfig(options));
  return res.data.message as FileDoc;
}

/**
 * The address to show or open a file. Frappe gives paths such as "/files/logo.png" or
 * "/private/files/x-ray.jpg", which must go through the /frappe rewrite; data URLs (dummy data) and full
 * addresses are used as they are.
 */
export function fileHref(url: string | null | undefined): string {
  if (!url) return "";
  return url.startsWith("/") && !url.startsWith("/frappe/") ? `/frappe${url}` : url;
}

/** True when a request failed because the doc does not exist (HTTP 404, or the dummy data's "not found"). */
export function isNotFound(err: unknown): boolean {
  if (axios.isAxiosError(err)) return err.response?.status === 404;
  return err instanceof Error && / not found$/.test(err.message);
}

const stripTags = (text: string) => text.replace(/<[^>]*>/g, "").trim();

/** Frappe's words without HTML, with two raw database errors turned into plain sentences. */
function plainMessage(text: string): string {
  const clean = stripTags(text);
  const duplicate = clean.match(/Duplicate entry '([^']*)'/i);
  if (duplicate) return messages().errors.duplicate(duplicate[1]);
  const tooLong = clean.match(/Data too long for column '([^']*)'/i);
  if (tooLong) return messages().errors.tooLong(tooLong[1].replace(/_/g, " "));
  return clean;
}

/** Turns a failed request into a sentence people can read, using Frappe's own message when there is one. */
export function errorMessage(err: unknown, fallback = messages().errors.generic): string {
  const e = messages().errors;
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { _server_messages?: string; exception?: string; message?: unknown }
      | undefined;
    if (data?._server_messages) {
      try {
        const messages: string[] = JSON.parse(data._server_messages);
        const first = JSON.parse(messages[0]) as { message?: string };
        if (first.message) return plainMessage(first.message);
      } catch {
        // Not the usual shape; fall through to the other checks.
      }
    }
    if (typeof data?.exception === "string") {
      const [, ...rest] = data.exception.split(":");
      return plainMessage(rest.join(":") || data.exception);
    }
    if (typeof data?.message === "string") return plainMessage(data.message);
    if (err.response?.status === 403) return e.noPermission;
    if (isServerDown(err)) {
      // A gateway timeout can come after the server has already saved.
      return (err.config?.method ?? "get").toLowerCase() === "get"
        ? e.serverDownRead
        : e.serverDownSave;
    }
    if ((err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") && err.config?.url?.includes("upload_file")) {
      return e.uploadTimeout(UPLOAD_TIMEOUT_MS / 60_000);
    }
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      // A save that timed out may still have gone through on the server.
      return (err.config?.method ?? "get").toLowerCase() === "get"
        ? e.timeoutRead
        : e.timeoutSave;
    }
    if (!err.response) return e.noConnection;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export default api;
