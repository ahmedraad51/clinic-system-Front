/**
 * What the front end asks the server about itself: is it there, does it have the internet, and how is the cloud copy.
 * The methods live in dent_app (docs/backend-todo.md section 10); with the dummy data src/lib/mockPlatform.ts answers.
 */

export const SERVER_METHODS = {
  status: "dent_app.api.server.status",
} as const;

/** The cloud copy of a clinic server: when it was last brought up to date, and how that went. */
export interface CloudCopyStatus {
  /** "ok": up to date; "syncing": being updated now; "failed": the last update failed; "never": not done yet. */
  status: "ok" | "syncing" | "failed" | "never";
  /** When the copy was last brought up to date ("2026-09-26 08:20:00", the server's time). */
  last_sync: string | null;
  /** Why the last update failed, in words. */
  error?: string;
  /** The copy's web address, for the owner ("alnoor-copy.dentclinic.example"). */
  address?: string;
}

/** The answer of SERVER_METHODS.status. */
export interface ServerStatus {
  /** The server's clock, "2026-09-26 08:30:00". */
  server_time: string;
  /** The dent_app version. */
  version: string;
  /** The server can reach the internet (a clinic server checks it; in the cloud it is always true). */
  internet: boolean;
  /** The cloud copy, or null when there is none (the cloud itself, or a clinic server without one). */
  cloud_copy: CloudCopyStatus | null;
}
