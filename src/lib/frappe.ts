import axios from "axios";
import type { BaseDoc, Doc, DocValue } from "./types";
import {
  mockGetList,
  mockGetCount,
  mockGetDoc,
  mockCreateDoc,
  mockUpdateDoc,
  mockDeleteDoc,
  mockCall,
  mockUpload,
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

const api = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "Expect": "",
  },
});

const resource = (doctype: string, name?: string) =>
  `/frappe/api/resource/${encodeURIComponent(doctype)}` + (name ? `/${encodeURIComponent(name)}` : "");

export const initAuth = () => {
  const csrf = localStorage.getItem("csrf_token");
  if (csrf) {
    api.defaults.headers.common["x-frappe-csrf-token"] = csrf;
  }
};

export const login = async (usr: string, pwd: string) => {
  const res = await api.post("/frappe/api/method/login", { usr, pwd });
  const csrf = res.headers["x-frappe-csrf-token"];
  if (csrf) {
    api.defaults.headers.common["x-frappe-csrf-token"] = csrf;
    localStorage.setItem("csrf_token", csrf);
  }
  return res.data;
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
  const res = await api.get(resource(doctype), {
    params: {
      fields: JSON.stringify(fields),
      filters: filters ? JSON.stringify(filters) : undefined,
      or_filters: orFilters?.length ? JSON.stringify(orFilters) : undefined,
      order_by: orderBy,
      limit_start: start,
      limit_page_length: limit,
    },
  });
  return res.data.data;
}

/** How many docs match. Used for paging and dashboard counts. */
export async function getCount(doctype: string, filters?: Filters, orFilters?: FilterRow[]): Promise<number> {
  if (MOCK_DATA) return mockGetCount(doctype, filters, orFilters);
  initAuth();
  if (orFilters?.length) {
    // frappe.client.get_count has no or_filters, so searches use the list view's count method.
    const res = await api.get("/frappe/api/method/frappe.desk.reportview.get_count", {
      params: {
        doctype,
        fields: JSON.stringify(["name"]),
        filters: JSON.stringify(filters ?? []),
        or_filters: JSON.stringify(orFilters),
        distinct: 0,
      },
    });
    return Number(res.data.message) || 0;
  }
  const res = await api.get("/frappe/api/method/frappe.client.get_count", {
    params: { doctype, filters: JSON.stringify(filters ?? []) },
  });
  return Number(res.data.message) || 0;
}

export async function getDoc<T extends BaseDoc = Doc>(doctype: string, name: string): Promise<T> {
  if (MOCK_DATA) return (await mockGetDoc(doctype, name)) as unknown as T;
  initAuth();
  const res = await api.get(resource(doctype, name));
  return res.data.data;
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

/** Uploads a file (e.g. the clinic logo) and returns its URL. */
export async function uploadFile(file: File): Promise<string> {
  if (MOCK_DATA) return mockUpload(file);
  initAuth();
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("is_private", "0");
  form.append("folder", "Home");
  // The instance default is JSON; multipart lets the browser set the boundary.
  const res = await api.post("/frappe/api/method/upload_file", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.message.file_url;
}

/** True when a request failed because the doc does not exist (HTTP 404, or the dummy data's "not found"). */
export function isNotFound(err: unknown): boolean {
  if (axios.isAxiosError(err)) return err.response?.status === 404;
  return err instanceof Error && / not found$/.test(err.message);
}

const stripTags = (text: string) => text.replace(/<[^>]*>/g, "").trim();

/** Turns a failed request into a sentence people can read, using Frappe's own message when there is one. */
export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { _server_messages?: string; exception?: string; message?: unknown }
      | undefined;
    if (data?._server_messages) {
      try {
        const messages: string[] = JSON.parse(data._server_messages);
        const first = JSON.parse(messages[0]) as { message?: string };
        if (first.message) return stripTags(first.message);
      } catch {
        // Not the usual shape; fall through to the other checks.
      }
    }
    if (typeof data?.exception === "string") {
      const [, ...rest] = data.exception.split(":");
      return stripTags(rest.join(":") || data.exception);
    }
    if (typeof data?.message === "string") return stripTags(data.message);
    if (err.response?.status === 403) return "You do not have permission to do this.";
    if (!err.response) return "Cannot reach the server. Check that the backend is running.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export default api;
