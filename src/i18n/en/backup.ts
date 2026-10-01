import { num, plural } from "../runtime";

/** Settings → Server & Backup: the connection to the server, the cloud copy and the backups. */
export const backup = {
  nav: "Server & Backup",
  title: "Server & Backup",
  subtitle: "Where your clinic's data lives, its copy online, and its backups.",
  // The server
  serverTitle: "Server",
  kinds: { cloud: "DentClinic cloud", "clinic-server": "Clinic server", "cloud-copy": "Online copy of the clinic server" },
  reach: { ok: "Connected", unreachable: "Cannot reach the server", checking: "Checking…" },
  address: "Address",
  serverTime: "Server time",
  version: "Version",
  internet: "Internet",
  internetYes: "Connected",
  internetNo: "No internet",
  checkNow: "Check Now",
  unreachableText: "Check that the clinic server is switched on and that this computer is on the clinic's network.",
  offlineText: "This computer has no network. Check the cable or the Wi-Fi.",
  // The cloud copy
  copyTitle: "Cloud Copy",
  copyText: "The clinic server sends a copy of everything online every 15 minutes while it has the internet, so the owner can look from home.",
  copyIsThis: "This is the online copy: it is updated from the clinic server every 15 minutes while the clinic has the internet.",
  copyStatus: { ok: "Up to date", syncing: "Updating now", failed: "Not updated", never: "Not made yet" },
  lastUpdate: "Last updated",
  copyAddress: "Online address",
  copyNever: "The copy has not been made yet.",
  ago: (minutes: number) =>
    minutes < 1
      ? "just now"
      : minutes < 60
        ? plural(minutes, { one: "# minute ago", other: "# minutes ago" })
        : minutes < 48 * 60
          ? plural(Math.floor(minutes / 60), { one: "# hour ago", other: "# hours ago" })
          : plural(Math.floor(minutes / 1440), { one: "# day ago", other: "# days ago" }),
  // Backups
  backupsTitle: "Backups",
  schedule: (time: string, days: number) => `A backup is made every night at ${time}. The last ${num(days)} days are kept.`,
  scheduleCloud: (time: string, days: number) =>
    `DentClinic backs up your clinic every night at ${time} and keeps the last ${num(days)} days. You can also keep your own copy.`,
  disk: (free: string, total: string) => `Free space on the backup disk: ${free} of ${total}.`,
  gb: (value: number) => `${num(Math.round(value * 10) / 10)} GB`,
  mb: (value: number) => `${num(Math.round(value * 10) / 10)} MB`,
  backupNow: "Back Up Now",
  backupStarted: "Backup started. It takes a minute or two.",
  backupDone: "Backup made.",
  backupFailed: "Could not start the backup.",
  alreadyRunning: "A backup is being made already.",
  saveToUsb: "Save a Backup to USB",
  saveThis: "Save to USB",
  saveFor: (date: string) => `Save the backup of ${date} to USB`,
  usbHint:
    "Plug in a USB drive, press Save a Backup to USB, and choose the drive in the window that opens. Keep the drive somewhere safe, away from the clinic's computers.",
  saved: "Backup saved. Keep the USB drive somewhere safe, away from the clinic's computers.",
  downloaded: "The backup is in this computer's Downloads folder. Copy it to the USB drive.",
  downloadFailed: "Could not save the backup. Try again.",
  notFound: "That backup is not there any more.",
  noBackups: "No backups yet.",
  loadFailed: "Could not load the backups.",
  columns: { when: "When", kind: "Made", size: "Size", status: "Status", cloud: "Online too" },
  kindsOf: { automatic: "Every night", manual: "By hand" },
  by: (name: string) => `by ${name}`,
  statuses: { running: "Being made", done: "Done", failed: "Failed" },
  inCloud: "Yes",
  notInCloud: "Not yet",
  mockDiskFull: "The backup disk was full. Old backups were removed, and the next night's backup worked.",
};
