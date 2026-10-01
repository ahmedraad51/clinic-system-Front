/**
 * What the front end asks the server about itself: is it there, does it have the internet, and how is the cloud copy.
 * The methods live in dent_app (docs/backend-todo.md section 10); with the dummy data src/lib/mockPlatform.ts answers.
 */

export const SERVER_METHODS = {
  status: "dent_app.api.server.status",
  /** The backups and their schedule (BackupOverview). */
  backups: "dent_app.api.backup.overview",
  /** Starts a backup now; answers the new ServerBackup (status "running"). */
  backupNow: "dent_app.api.backup.backup_now",
  /** GET with `backup=<name>`: the backup's file itself, sent as a download. */
  downloadBackup: "dent_app.api.backup.download",
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

/** One backup the server made (every night, or when asked). */
export interface ServerBackup {
  /** "BKP-2026-09-26-0200" */
  name: string;
  /** When it was made ("2026-09-26 02:00:00", the server's time). */
  created_at: string;
  /** Made by the nightly schedule, or by someone pressing Back up now. */
  kind: "automatic" | "manual";
  /** "running" while it is being made. */
  status: "running" | "done" | "failed";
  /** The size of the file in MB (the database and the uploaded files), once done. */
  size_mb: number | null;
  /** Also sent to the cloud copy (a clinic server with one). */
  in_cloud: boolean;
  /** The file's name when saved ("dentclinic-backup-2026-09-26-0200.zip"). */
  file_name: string;
  /** Who asked for it (a manual backup), as a name. */
  by?: string;
  /** Why it failed, in words. */
  error?: string;
}

/** The answer of SERVER_METHODS.backups. */
export interface BackupOverview {
  /** Newest first. */
  backups: ServerBackup[];
  /** The time of the nightly backup ("02:00"). */
  schedule_time: string;
  /** How many days of backups are kept. */
  keep_days: number;
  /** The space on the backup disk of a clinic server (null in the cloud). */
  disk: { free_gb: number; total_gb: number } | null;
}
