import { messages } from "@/i18n";
import { currentMode } from "./deployment";
import { demoFlag } from "./demo";
import { SERVER_METHODS, type ServerStatus } from "./server";

/**
 * The dummy back end for the parts that sell and run DentClinic: the server's status, the cloud copy, backups, the
 * licence, the clinic's plan and the platform owner's clinics. Kept apart from mockData.ts (the clinic's own records).
 * Like Frappe, every method is called with callMethod("dent_app…", args).
 */

type Args = Record<string, unknown>;

/** "2026-09-26 08:30:00" in local time, like Frappe's datetimes. */
export function frappeDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const minutesAgo = (minutes: number) => frappeDateTime(new Date(Date.now() - minutes * 60_000));

function serverStatus(): ServerStatus {
  const mode = currentMode(true);
  const internet = mode === "clinic-server" ? !demoFlag("noInternet") : true;
  return {
    server_time: frappeDateTime(new Date()),
    version: "1.0.0",
    internet,
    // A clinic server with a cloud copy, and the copy itself, know when the copy was last brought up to date.
    cloud_copy:
      mode === "cloud"
        ? null
        : internet
          ? { status: "ok", last_sync: minutesAgo(12), address: "alnoor-copy.dentclinic.example" }
          : { status: "failed", last_sync: minutesAgo(95), error: messages().connection.copyNoInternet, address: "alnoor-copy.dentclinic.example" },
  };
}

const latency = () => new Promise((resolve) => setTimeout(resolve, 150));

export async function mockPlatformCall(method: string, args: Args): Promise<unknown> {
  await latency();
  void args;
  switch (method) {
    case SERVER_METHODS.status:
      return serverStatus();
    default:
      throw new Error(messages().errors.mock.noMethod(method));
  }
}
