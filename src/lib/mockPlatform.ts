import { messages } from "@/i18n";
import { GRACE_DAYS, PLAN_KEYS, PLANS, TRIAL_DAYS, type PlanKey, type PlanLimits } from "@/config/sales";
import { currentMode, isValidClinicAddress } from "./deployment";
import { demoFlag } from "./demo";
import { addDays, addMonths, todayISO } from "./format";
import { LICENSE_KEY_PATTERN, LICENSE_METHODS, type LicenseStatus } from "./license";
import { mockActingUser, mockGetCount, mockGetDoc, mockGetList } from "./mockData";
import {
  PAYMENT_CHANNELS, PLATFORM_METHODS, paidUntilAfter, type ChangeRequest, type ClinicAccount, type PaymentChannel, type PlatformPayment,
  type TrialRequest, type TrialRequestDoc,
} from "./platform";
import { SERVER_METHODS, type BackupOverview, type ServerBackup, type ServerStatus } from "./server";
import { zipFiles } from "./spreadsheet";
import { SUBSCRIPTION_METHODS, type Subscription } from "./subscription";

/**
 * The dummy back end for the parts that sell and run DentClinic: the server's status, the cloud copy, the clinic's
 * plan and the platform owner's clinics, payments and requests. Kept apart from mockData.ts (the clinic's own records).
 * Like Frappe, every method is called with callMethod("dent_app…", args). The clinic these screens run as is the
 * platform's "demo" clinic, so the platform owner's changes (a payment, a suspension) show in its Plan page at once.
 */

type Args = Record<string, unknown>;

/** "2026-09-26 08:30:00" in local time, like Frappe's datetimes. */
export function frappeDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const minutesAgo = (minutes: number) => frappeDateTime(new Date(Date.now() - minutes * 60_000));

/* --- The server --------------------------------------------------------------------------------------------------- */

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

/* --- Backups ------------------------------------------------------------------------------------------------------- */

let backups: ServerBackup[] | null = null;
/** For the size of a manual backup: the latest nightly one plus a little. */
const BACKUP_MB = 26.4;

const backupName = (at: string) => `BKP-${at.slice(0, 10)}-${at.slice(11, 13)}${at.slice(14, 16)}`;
const backupFileName = (at: string) => `dentclinic-backup-${at.slice(0, 10)}-${at.slice(11, 13)}${at.slice(14, 16)}.zip`;

/** A week of nightly backups at 02:00; one failed (the disk was full) and the next night's worked. */
function serverBackups(): ServerBackup[] {
  if (backups) return backups;
  const today = todayISO();
  backups = Array.from({ length: 7 }, (_, i) => {
    const at = `${addDays(today, -i)} 02:00:00`;
    const failed = i === 3;
    return {
      name: backupName(at), created_at: at, kind: "automatic" as const, status: failed ? ("failed" as const) : ("done" as const),
      size_mb: failed ? null : Math.round((BACKUP_MB - i * 0.3) * 10) / 10, in_cloud: !failed, file_name: backupFileName(at),
      error: failed ? messages().backup.mockDiskFull : undefined,
    };
  });
  return backups;
}

function backupOverview(): BackupOverview {
  const mode = currentMode(true);
  // Without internet, the night's backup stayed on the clinic server.
  const internet = mode !== "clinic-server" || !demoFlag("noInternet");
  const list = serverBackups().map((b, i) => (i === 0 && !internet && b.kind === "automatic" ? { ...b, in_cloud: false } : { ...b }));
  return { backups: list, schedule_time: "02:00", keep_days: 14, disk: mode === "clinic-server" ? { free_gb: 182.4, total_gb: 238.5 } : null };
}

async function backupNow(): Promise<ServerBackup> {
  if (serverBackups().some((b) => b.status === "running")) throw new Error(messages().backup.alreadyRunning);
  const at = frappeDateTime(new Date());
  let by = mockActingUser();
  try {
    by = String((await mockGetDoc("User", by)).full_name || by);
  } catch {
    // Keep the user ID.
  }
  const backup: ServerBackup = {
    name: backupName(at), created_at: at, kind: "manual", status: "running", size_mb: null, in_cloud: false, file_name: backupFileName(at), by,
  };
  serverBackups().unshift(backup);
  // Done a few seconds later (window.__mockBackupMs for tests), and sent to the cloud copy when there is internet.
  const ms = typeof window !== "undefined" ? ((window as unknown as { __mockBackupMs?: number }).__mockBackupMs ?? 3000) : 3000;
  setTimeout(() => {
    backup.status = "done";
    backup.size_mb = BACKUP_MB + 0.1;
    backup.in_cloud = currentMode(true) !== "clinic-server" || !demoFlag("noInternet");
  }, ms);
  return { ...backup };
}

/** The backup's file: a ZIP with the clinic's records as JSON and a README (a real one holds the database and the files). */
export async function mockBackupFile(name: string): Promise<Uint8Array> {
  const backup = serverBackups().find((b) => b.name === name && b.status === "done");
  if (!backup) throw new Error(messages().backup.notFound);
  const doctypes = [
    "Patient", "Doctor", "Appointment", "Treatment Plan", "Treatment Session", "Payment", "Expense", "Prescription", "Dental Medicine",
    "Dental Image", "Cash Count",
  ];
  const data: Record<string, unknown> = {};
  for (const doctype of doctypes) data[doctype] = await mockGetList(doctype, ["*"], { limit: 0 });
  data["Clinic Settings"] = await mockGetDoc("Clinic Settings", "Clinic Settings");
  const encode = (text: string) => new TextEncoder().encode(text);
  return zipFiles({
    "README.txt": encode(`DentClinic backup ${backup.created_at}\r\nThe dummy data's records as JSON. A real backup holds the database and the uploaded files.\r\n`),
    "records.json": encode(JSON.stringify(data, null, 1)),
  });
}

/* --- The licence of a clinic server ---------------------------------------------------------------------------------- */

let license: LicenseStatus | null = null;

function currentLicense(): LicenseStatus {
  if (!license) {
    license = {
      key: "DCL-4F2A-••••-••••-9C1E", clinic_name: "DentClinic", plan: "server-cloud", issued_on: "2025-11-20",
      expires_on: addDays(todayISO(), 55), status: "valid", grace_days: GRACE_DAYS, server_id: "SRV-7Q2M-K9XA",
    };
  }
  // For tests (set before the app loads): window.__mockLicense changes it until a new key is entered.
  const override = typeof window !== "undefined" ? (window as unknown as { __mockLicense?: Partial<LicenseStatus> }).__mockLicense : undefined;
  const result = { ...license, ...override };
  if (result.status === "valid" && result.expires_on < todayISO()) result.status = "expired";
  return result;
}

function activateLicense(args: Args): LicenseStatus {
  const key = String(args.key ?? "").trim().toUpperCase();
  // In the dummy data a key ending in 0000 stands for one made for another computer.
  if (!LICENSE_KEY_PATTERN.test(key) || key.endsWith("-0000")) throw new Error(messages().license.badKey);
  const current = currentLicense();
  // A year on from the current end, or from today when it has passed.
  const from = current.expires_on > todayISO() ? current.expires_on : todayISO();
  license = { ...current, key: `${key.slice(0, 8)}-••••-••••-${key.slice(-4)}`, issued_on: todayISO(), expires_on: addMonths(from, 12), status: "valid" };
  if (typeof window !== "undefined") delete (window as unknown as { __mockLicense?: unknown }).__mockLicense;
  return currentLicense();
}

/* --- The platform's records ----------------------------------------------------------------------------------------- */

/** The clinic this app runs as, among the platform's clinics. */
const CURRENT = "CLN-00001";

let clinics: ClinicAccount[] | null = null;
let payments: PlatformPayment[] = [];
const trialRequests: TrialRequestDoc[] = [];
const changeRequests: ChangeRequest[] = [];
let changeCount = 1;

/** Made on first use, so the dates count from "today" (the tests fix the clock). */
function platformClinics(): ClinicAccount[] {
  if (clinics) return clinics;
  const today = todayISO();
  const usage = (doctors: number, users: number, storage_mb: number) => ({ doctors, users, storage_mb });
  clinics = [
    {
      name: CURRENT, clinic_name: "DentClinic", address: "demo", plan: "cloud", status: "active", manager_email: "laith.hamid@dentclinic.test",
      created_on: "2026-01-10", trial_ends_on: "2026-01-24", paid_until: addDays(today, 40), limits: PLANS["cloud"].limits, usage: usage(0, 0, 0), last_payment_on: addDays(today, -20),
    },
    {
      name: "CLN-00002", clinic_name: "عيادة النور لطب الأسنان", address: "alnoor", plan: "server-cloud", status: "active", manager_email: "manager@alnoor.example",
      created_on: "2025-11-02", trial_ends_on: null, paid_until: "2027-03-31", limits: PLANS["server-cloud"].limits, usage: usage(6, 12, 8400), last_payment_on: "2026-04-01",
    },
    {
      name: "CLN-00003", clinic_name: "مركز بسمة لطب الأسنان", address: "basma", plan: "cloud", status: "trial", manager_email: "basma.center@example.com",
      created_on: addDays(today, -9), trial_ends_on: addDays(today, TRIAL_DAYS - 9), paid_until: null, limits: PLANS["cloud"].limits, usage: usage(2, 3, 120), last_payment_on: null,
    },
    {
      name: "CLN-00004", clinic_name: "عيادة الرافدين", address: "rafidain", plan: "cloud", status: "suspended", manager_email: "rafidain@example.com",
      created_on: "2025-12-15", trial_ends_on: null, paid_until: addDays(today, -30), limits: PLANS["cloud"].limits, usage: usage(3, 4, 950), last_payment_on: "2026-07-26",
    },
    {
      name: "CLN-00005", clinic_name: "Smile Dental Erbil", address: "smile-erbil", plan: "cloud", status: "ended", manager_email: "owner@smile-erbil.example",
      created_on: "2026-03-01", trial_ends_on: null, paid_until: addDays(today, -3), limits: PLANS["cloud"].limits, usage: usage(4, 6, 2300), last_payment_on: addDays(today, -33),
    },
  ];
  trialRequests.push({
    name: "TRQ-00001", clinic_name: "عيادة الكرادة لطب الأسنان", contact_name: "د. سارة جميل", phone: "0771 456 7788", city: "بغداد",
    email: "sara.jameel@example.com", plan: "cloud", address: "karrada", message: "نريد تجربة النظام في عيادتنا قبل نهاية الشهر.",
    language: "ar", creation: minutesAgo(26 * 60), status: "New",
  });
  changeRequests.push({
    name: "PCR-00001", clinic: "CLN-00003", clinic_name: "مركز بسمة لطب الأسنان", from_plan: "cloud", plan: "server-cloud",
    note: "نريد أن تعمل العيادة بلا إنترنت.", requested_on: addDays(today, -2),
  });
  payments = [
    { name: "PPY-00003", clinic: CURRENT, clinic_name: "DentClinic", amount: 90_000, currency: "IQD", method: "Qi Card", paid_on: addDays(today, -20), periods: 2, reference: "QI-73001", paid_until: addDays(today, 40) },
    { name: "PPY-00002", clinic: "CLN-00004", clinic_name: "عيادة الرافدين", amount: 45_000, currency: "IQD", method: "Zain Cash", paid_on: "2026-07-26", periods: 1, reference: "ZC-55102", paid_until: addDays(today, -30) },
    { name: "PPY-00001", clinic: "CLN-00002", clinic_name: "عيادة النور لطب الأسنان", amount: 650_000, currency: "IQD", method: "Bank Transfer", paid_on: "2026-04-01", periods: 1, reference: "TRF-88123", paid_until: "2027-03-31" },
  ];
  return clinics;
}

/** The current clinic's real use, counted from the dummy data: active doctors, staff who can log in, files. */
async function currentUsage() {
  const doctors = await mockGetCount("Doctor", [["is_active", "=", 1]]);
  const users = await mockGetCount("User", [["name", "not in", ["Administrator", "Guest"]], ["enabled", "=", 1]]);
  const images = await mockGetList("Dental Image", ["name"], { limit: 0 });
  // The demo X-rays stand for about 2.4 MB each.
  return { doctors, users, storage_mb: Math.round(images.length * 2.4 * 10) / 10 };
}

/** For tests only (set before the app loads): `window.__mockPlanLimits` and `window.__mockSubscription` change the current clinic. */
function testOverrides(): { limits?: Partial<PlanLimits>; subscription?: Partial<Subscription> } {
  if (typeof window === "undefined") return {};
  const w = window as unknown as { __mockPlanLimits?: Partial<PlanLimits>; __mockSubscription?: Partial<Subscription> };
  return { limits: w.__mockPlanLimits, subscription: w.__mockSubscription };
}

/** The account's status as it stands today (one whose paid days or trial are over has ended). */
function liveStatus(account: ClinicAccount): ClinicAccount["status"] {
  const today = todayISO();
  if (account.status === "suspended") return "suspended";
  if (account.status === "trial") return account.trial_ends_on && account.trial_ends_on < today ? "ended" : "trial";
  return account.paid_until && account.paid_until < today ? "ended" : "active";
}

async function subscriptionStatus(): Promise<Subscription> {
  const account = platformClinics().find((c) => c.name === CURRENT)!;
  const overrides = testOverrides();
  const pending = changeRequests.find((r) => r.clinic === CURRENT);
  // A clinic server (and its cloud copy) runs on its licence: the plan and until when come from it.
  const lic = currentMode(true) === "cloud" ? null : currentLicense();
  const planKey = lic?.plan ?? account.plan;
  const plan = PLANS[planKey];
  return {
    plan: planKey,
    status: lic ? (lic.status === "valid" ? "active" : "ended") : liveStatus(account),
    trial_ends_on: lic ? null : account.trial_ends_on,
    paid_until: lic ? lic.expires_on : account.paid_until,
    grace_days: GRACE_DAYS,
    limits: { ...(lic ? plan.limits : account.limits), ...overrides.limits },
    usage: await currentUsage(),
    price: plan.price,
    currency: plan.currency,
    period: plan.period,
    pending_request: pending ? { plan: pending.plan, requested_on: pending.requested_on } : null,
    ...overrides.subscription,
  };
}

function requestChange(args: Args): string {
  const e = messages().platform.errors;
  const plan = String(args.plan ?? "") as PlanKey;
  if (!PLAN_KEYS.includes(plan)) throw new Error(e.plan);
  const account = platformClinics().find((c) => c.name === CURRENT)!;
  const index = changeRequests.findIndex((r) => r.clinic === CURRENT);
  if (index >= 0) changeRequests.splice(index, 1);
  const name = `PCR-${String(++changeCount).padStart(5, "0")}`;
  changeRequests.unshift({
    name, clinic: CURRENT, clinic_name: account.clinic_name, from_plan: account.plan, plan, note: String(args.note ?? ""), requested_on: todayISO(),
  });
  return name;
}

async function listClinics(): Promise<ClinicAccount[]> {
  const usage = await currentUsage();
  return platformClinics().map((c) => ({ ...c, status: liveStatus(c), usage: c.name === CURRENT ? usage : c.usage }));
}

function createClinic(args: Args): ClinicAccount {
  const e = messages().platform.errors;
  const clinicName = String(args.clinic_name ?? "").trim();
  const address = String(args.address ?? "").trim().toLowerCase();
  const plan = String(args.plan ?? "") as PlanKey;
  const email = String(args.manager_email ?? "").trim();
  if (!clinicName) throw new Error(e.clinicName);
  if (!isValidClinicAddress(address)) throw new Error(e.address);
  if (platformClinics().some((c) => c.address === address)) throw new Error(e.addressTaken(address));
  if (!PLAN_KEYS.includes(plan)) throw new Error(e.plan);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(e.email);
  const today = todayISO();
  const account: ClinicAccount = {
    name: `CLN-${String(platformClinics().length + 1).padStart(5, "0")}`,
    clinic_name: clinicName, address, plan, status: "trial", manager_email: email, created_on: today,
    trial_ends_on: addDays(today, TRIAL_DAYS), paid_until: null, limits: PLANS[plan].limits, usage: { doctors: 0, users: 1, storage_mb: 0 }, last_payment_on: null,
  };
  platformClinics().push(account);
  // Made from a free-trial request: that request has now started.
  const request = trialRequests.find((r) => r.name === args.trial_request);
  if (request) request.status = "Started";
  return account;
}

function recordPayment(args: Args): PlatformPayment {
  const e = messages().platform.errors;
  const account = platformClinics().find((c) => c.name === args.clinic);
  if (!account) throw new Error(e.clinic);
  const amount = Number(args.amount);
  const periods = Math.floor(Number(args.periods));
  const method = String(args.method ?? "") as PaymentChannel;
  const paidOn = String(args.paid_on || todayISO());
  if (!(amount > 0)) throw new Error(e.amount);
  if (!PAYMENT_CHANNELS.includes(method)) throw new Error(e.method);
  if (!(periods >= 1 && periods <= 36)) throw new Error(e.periods);
  const paidUntil = paidUntilAfter(account, paidOn, periods);
  account.paid_until = paidUntil;
  account.last_payment_on = paidOn;
  if (account.status !== "suspended") account.status = "active";
  const payment: PlatformPayment = {
    name: `PPY-${String(payments.length + 1).padStart(5, "0")}`,
    clinic: account.name, clinic_name: account.clinic_name, amount, currency: String(args.currency || "IQD"), method, paid_on: paidOn, periods,
    reference: String(args.reference ?? ""), paid_until: paidUntil,
  };
  payments.unshift(payment);
  return payment;
}

function setSuspended(args: Args): ClinicAccount {
  const account = platformClinics().find((c) => c.name === args.clinic);
  if (!account) throw new Error(messages().platform.errors.clinic);
  if (Number(args.suspended) === 1) account.status = "suspended";
  else {
    const today = todayISO();
    account.status = account.paid_until && account.paid_until >= today ? "active" : account.trial_ends_on && account.trial_ends_on >= today ? "trial" : "ended";
  }
  return account;
}

function requestTrial(args: Args): string {
  const e = messages().errors.mock;
  const request = args as unknown as TrialRequest;
  if (!String(request.clinic_name ?? "").trim() || !String(request.contact_name ?? "").trim() || !String(request.phone ?? "").trim()) {
    throw new Error(e.required);
  }
  platformClinics();
  const name = `TRQ-${String(trialRequests.length + 1).padStart(5, "0")}`;
  trialRequests.unshift({ ...request, name, creation: frappeDateTime(new Date()), status: "New" });
  return name;
}

const latency = () => new Promise((resolve) => setTimeout(resolve, 150));

export async function mockPlatformCall(method: string, args: Args): Promise<unknown> {
  await latency();
  switch (method) {
    case SERVER_METHODS.status:
      return serverStatus();
    case SERVER_METHODS.backups:
      return backupOverview();
    case SERVER_METHODS.backupNow:
      return backupNow();
    case LICENSE_METHODS.status:
      return currentLicense();
    case LICENSE_METHODS.activate:
      return activateLicense(args);
    case SUBSCRIPTION_METHODS.status:
      return subscriptionStatus();
    case SUBSCRIPTION_METHODS.requestChange:
      return requestChange(args);
    case PLATFORM_METHODS.requestTrial:
      return requestTrial(args);
    case PLATFORM_METHODS.clinics:
      return listClinics();
    case PLATFORM_METHODS.createClinic:
      return createClinic(args);
    case PLATFORM_METHODS.recordPayment:
      return recordPayment(args);
    case PLATFORM_METHODS.setSuspended:
      return setSuspended(args);
    case PLATFORM_METHODS.payments:
      platformClinics();
      return args.clinic ? payments.filter((p) => p.clinic === args.clinic) : payments;
    case PLATFORM_METHODS.trialRequests:
      platformClinics();
      return trialRequests;
    case PLATFORM_METHODS.changeRequests:
      platformClinics();
      return changeRequests;
    default:
      throw new Error(messages().errors.mock.noMethod(method));
  }
}
