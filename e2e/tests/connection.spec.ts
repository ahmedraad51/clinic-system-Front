import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { expect, test } from "../fixtures";
import api, {
  errorMessage,
  isRetriableReadError,
  isServerDown,
  login,
  loginNotKeptMessage,
  onSessionEnded,
  onSessionRestored,
  passwordResetMessage,
  sessionEndedMessage,
  SessionEndedError,
  twoFactorMessage,
  withReadRetry,
} from "../../src/lib/frappe";
import { loginHref, safeNextPath } from "../../src/lib/links";

/*
 * The app runs on dummy data (MOCK_DATA = true), so these tests talk to the real Frappe code in
 * src/lib/frappe.ts through a fake server: axios's adapter is swapped for a function that answers each call.
 */

type Reply = { status: number; data?: unknown } | "network" | "timeout";

function startFakeServer(answer: (config: InternalAxiosRequestConfig) => Reply) {
  const original = api.defaults.adapter;
  api.defaults.adapter = (config: InternalAxiosRequestConfig) =>
    new Promise<AxiosResponse>((resolve, reject) => {
      // A short pause, like a real server, so parallel calls overlap.
      setTimeout(() => {
        const reply = answer(config);
        if (reply === "network") return reject(new AxiosError("Network Error", "ERR_NETWORK", config));
        if (reply === "timeout") return reject(new AxiosError("timeout of 15000ms exceeded", "ECONNABORTED", config));
        const response = { data: reply.data === undefined ? {} : reply.data, status: reply.status, statusText: "", headers: {}, config } as AxiosResponse;
        if (reply.status >= 400) {
          const code = reply.status >= 500 ? "ERR_BAD_RESPONSE" : "ERR_BAD_REQUEST";
          return reject(new AxiosError(`Request failed with status code ${reply.status}`, code, config, null, response));
        }
        resolve(response);
      }, 10);
    });
  return () => {
    api.defaults.adapter = original;
  };
}

const forbidden: Reply = { status: 403, data: { exc_type: "PermissionError" } };

/**
 * Tests in one worker share src/lib/frappe.ts, which remembers that an ended login was already reported. One
 * call that works resets it, so each test starts from a working session.
 */
async function startWithWorkingSession() {
  const restore = startFakeServer(() => ({ status: 200, data: { data: [] } }));
  try {
    await api.get("/frappe/api/resource/Patient");
  } finally {
    restore();
  }
}

test("an ended login is reported once, and not as missing permission", async () => {
  await startWithWorkingSession();
  let probes = 0;
  const restore = startFakeServer((config) => {
    if (config.url?.includes("frappe.auth.get_logged_user")) probes++;
    // Frappe answers an expired session with 403, and the "who is logged in?" question too.
    return forbidden;
  });
  let ended = 0;
  const stop = onSessionEnded(() => ended++);
  try {
    const results = await Promise.allSettled([
      api.get("/frappe/api/resource/Patient"),
      api.get("/frappe/api/resource/Appointment"),
      api.post("/frappe/api/resource/Payment", {}),
    ]);
    for (const result of results) {
      expect(result.status).toBe("rejected");
      const reason = (result as PromiseRejectedResult).reason;
      expect(reason).toBeInstanceOf(SessionEndedError);
      expect(errorMessage(reason)).toBe(sessionEndedMessage());
    }
    // One question to the server and one notice, for three failed calls.
    expect(probes).toBe(1);
    expect(ended).toBe(1);
  } finally {
    stop();
    restore();
  }
});

test("when requests work again after an ended login, the app is told once", async () => {
  await startWithWorkingSession();
  let loggedIn = false;
  const restore = startFakeServer((config) => {
    if (config.url?.includes("frappe.auth.get_logged_user")) return loggedIn ? { status: 200, data: { message: "zahraa@dentclinic.test" } } : forbidden;
    return loggedIn ? { status: 200, data: { data: [] } } : forbidden;
  });
  let ended = 0;
  let restored = 0;
  const stopEnded = onSessionEnded(() => ended++);
  const stopRestored = onSessionRestored(() => restored++);
  try {
    await expect(api.get("/frappe/api/resource/Patient")).rejects.toBeInstanceOf(SessionEndedError);
    expect(ended).toBe(1);
    // The login is renewed elsewhere (another tab): the next calls work, and the app hears it once.
    loggedIn = true;
    await api.get("/frappe/api/resource/Patient");
    await api.get("/frappe/api/resource/Payment");
    expect(restored).toBe(1);
  } finally {
    stopEnded();
    stopRestored();
    restore();
  }
});

test("a logged-in user without permission still sees the permission message", async () => {
  await startWithWorkingSession();
  const restore = startFakeServer((config) =>
    config.url?.includes("frappe.auth.get_logged_user") ? { status: 200, data: { message: "dalia@dentclinic.test" } } : forbidden,
  );
  let ended = 0;
  const stop = onSessionEnded(() => ended++);
  try {
    const error = await api.get("/frappe/api/resource/Payment").catch((err: unknown) => err);
    expect(error).not.toBeInstanceOf(SessionEndedError);
    expect(errorMessage(error)).toBe("You do not have permission to do this.");
    expect(ended).toBe(0);
  } finally {
    stop();
    restore();
  }
});

test("login checks that the browser kept the session", async () => {
  let loggedIn = "Guest";
  const restore = startFakeServer((config) => {
    if (config.url?.includes("/api/method/login")) return { status: 200, data: { message: "Logged In" } };
    if (config.url?.includes("frappe.auth.get_logged_user")) return { status: 200, data: { message: loggedIn } };
    return { status: 404 };
  });
  try {
    // The cookie was not kept: Frappe still sees a guest.
    await expect(login("dalia", "secret")).rejects.toThrow(loginNotKeptMessage());
    // It was kept: the user ID comes from Frappe, not from what was typed.
    loggedIn = "dalia@dentclinic.test";
    await expect(login("dalia", "secret")).resolves.toBe("dalia@dentclinic.test");
  } finally {
    restore();
  }
});

test("a login check that fails for another reason is explained as it is", async () => {
  let answer: "normal" | "twoFactor" | "passwordReset" = "normal";
  const restore = startFakeServer((config) => {
    if (config.url?.includes("/api/method/login"))
      return {
        status: 200,
        data:
          answer === "twoFactor"
            ? { verification: { method: "OTP App" }, tmp_id: "abc" }
            : answer === "passwordReset"
              ? { message: "Password Reset", redirect_to: "/update-password?key=abc" }
              : { message: "Logged In" },
      };
    // Frappe is down behind the rewrite, which answers with a plain error page.
    return { status: 500, data: "Internal Server Error" };
  });
  try {
    const error = await login("dalia", "secret").catch((err: unknown) => err);
    expect(errorMessage(error)).toBe("The clinic server is not answering. Please try again in a moment.");
    answer = "twoFactor";
    await expect(login("dalia", "secret")).rejects.toThrow(twoFactorMessage());
    answer = "passwordReset";
    await expect(login("dalia", "secret")).rejects.toThrow(passwordResetMessage());
  } finally {
    restore();
  }
});

test("failed requests are explained in plain words", () => {
  const read = { method: "get", headers: {} } as InternalAxiosRequestConfig;
  const save = { method: "post", headers: {} } as InternalAxiosRequestConfig;
  expect(errorMessage(new AxiosError("timeout", "ECONNABORTED", read))).toBe("The server took too long to answer. Please try again.");
  expect(errorMessage(new AxiosError("timeout", "ECONNABORTED", save))).toBe(
    "The server took too long to answer. It may still have been saved, so check before trying again.",
  );
  expect(errorMessage(new AxiosError("Network Error", "ERR_NETWORK", read))).toBe(
    "Cannot reach the server. Check the internet connection and try again.",
  );

  const refusal = (data: unknown, status = 417) =>
    new AxiosError("Request failed", "ERR_BAD_REQUEST", save, null, { data, status, statusText: "", headers: {}, config: save } as AxiosResponse);
  expect(
    errorMessage(refusal({ exception: "frappe.exceptions.DuplicateEntryError: (1062, \"Duplicate entry '07701234567' for key 'phone_number'\")" }, 409)),
  ).toBe('"07701234567" is already used by another record.');
  expect(errorMessage(refusal({ exception: "pymysql.err.DataError: (1406, \"Data too long for column 'reason_for_visit' at row 1\")" }))).toBe(
    "Too much text for reason for visit. Please shorten it.",
  );
  // Frappe's own sentence, without its HTML.
  const serverMessages = JSON.stringify([JSON.stringify({ message: "Paid amount cannot be more than the <b>total cost</b>." })]);
  expect(errorMessage(refusal({ _server_messages: serverMessages }))).toBe("Paid amount cannot be more than the total cost.");
});

test("reads are sent again only when no answer came back", async () => {
  const noAnswer = new AxiosError("Network Error", "ERR_NETWORK", { headers: {} } as InternalAxiosRequestConfig);
  const timedOut = new AxiosError("timeout", "ECONNABORTED", { headers: {} } as InternalAxiosRequestConfig);
  expect(isRetriableReadError(noAnswer)).toBe(true);
  expect(isRetriableReadError(timedOut)).toBe(false);
  expect(isRetriableReadError(new SessionEndedError())).toBe(false);
  // Frappe down behind the rewrite (502, or 500 with a plain page) counts as no answer; a Frappe error does not.
  const answered = (status: number, data: unknown) =>
    new AxiosError("Request failed", "ERR_BAD_RESPONSE", { headers: {} } as InternalAxiosRequestConfig, null, {
      data,
      status,
      statusText: "",
      headers: {},
      config: { headers: {} } as InternalAxiosRequestConfig,
    } as AxiosResponse);
  expect(isServerDown(answered(502, "Bad Gateway"))).toBe(true);
  expect(isServerDown(answered(500, "Internal Server Error"))).toBe(true);
  expect(isServerDown(answered(500, { exc_type: "ValidationError", exception: "frappe.exceptions.ValidationError: No" }))).toBe(false);
  expect(isRetriableReadError(answered(503, ""))).toBe(true);
  expect(errorMessage(answered(502, "Bad Gateway"))).toBe("The clinic server is not answering. Please try again in a moment.");
  // For a save, a gateway timeout may come after the server saved.
  const failedSave = new AxiosError("Request failed", "ERR_BAD_RESPONSE", { method: "post", headers: {} } as InternalAxiosRequestConfig, null, {
    data: "Gateway Timeout",
    status: 504,
    statusText: "",
    headers: {},
    config: { headers: {} } as InternalAxiosRequestConfig,
  } as AxiosResponse);
  expect(errorMessage(failedSave)).toBe("The clinic server did not answer. It may still have been saved, so check before trying again.");

  // Two lost answers, then a good one.
  let calls = 0;
  const result = await withReadRetry(async () => {
    calls++;
    if (calls < 3) throw noAnswer;
    return "rows";
  }, 2, 1);
  expect(result).toBe("rows");
  expect(calls).toBe(3);

  // A refusal is final: asked once.
  calls = 0;
  const refused = new AxiosError("Request failed", "ERR_BAD_REQUEST", { headers: {} } as InternalAxiosRequestConfig, null, {
    data: {},
    status: 417,
    statusText: "",
    headers: {},
    config: { headers: {} } as InternalAxiosRequestConfig,
  } as AxiosResponse);
  await expect(
    withReadRetry(async () => {
      calls++;
      throw refused;
    }, 2, 1),
  ).rejects.toBe(refused);
  expect(calls).toBe(1);

  // Still no answer after the retries: the error comes through.
  calls = 0;
  await expect(
    withReadRetry(async () => {
      calls++;
      throw noAnswer;
    }, 2, 1),
  ).rejects.toBe(noAnswer);
  expect(calls).toBe(3);
});

test("after logging in the app returns to the page, and only to its own pages", () => {
  expect(loginHref("/patients?balance=owing")).toBe("/login?next=%2Fpatients%3Fbalance%3Dowing");
  expect(loginHref("/today", true)).toBe("/login?next=%2Ftoday&ended=1");
  expect(loginHref("/")).toBe("/login");
  expect(safeNextPath("/patients?balance=owing")).toBe("/patients?balance=owing");
  expect(safeNextPath(null)).toBe("/dashboard");
  expect(safeNextPath("https://example.com")).toBe("/dashboard");
  expect(safeNextPath("//example.com")).toBe("/dashboard");
  expect(safeNextPath("/\\example.com")).toBe("/dashboard");
  // Browsers drop tabs and line breaks, so these would lead to example.com too.
  expect(safeNextPath("/\t/example.com")).toBe("/dashboard");
  expect(safeNextPath("/\n/example.com")).toBe("/dashboard");
  // Dot segments that resolve to "//example.com".
  expect(safeNextPath("/.//example.com")).toBe("/dashboard");
  expect(safeNextPath("/a/..//example.com")).toBe("/dashboard");
  expect(safeNextPath("/%2e//example.com")).toBe("/dashboard");
  expect(safeNextPath("/patients/PAT-2026-00001#chart")).toBe("/patients/PAT-2026-00001#chart");
  expect(safeNextPath("/login?next=%2Ftoday")).toBe("/dashboard");
});
