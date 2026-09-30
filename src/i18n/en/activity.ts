import { plural } from "../runtime";

/** The activity log (/activity): who added, changed and deleted what, and restoring deleted records. */
export const activity = {
  title: "Activity",
  subtitle: "Who added, changed and deleted which record. A record deleted by mistake can be restored here.",
  kindFilter: "What happened",
  kinds: { all: "Everything", added: "Added", changed: "Changed", deleted: "Deleted" },
  typeFilter: "Record",
  allTypes: "All records",
  verbs: { added: "added", changed: "changed", deleted: "deleted" },
  someone: "Someone",
  restore: "Restore",
  restored: "Restored",
  restoredAs: (name: string) => `Restored as ${name}`,
  restoredToast: (what: string) => `${what} is back.`,
  restoreFailed: "Could not restore it.",
  none: "Nothing yet.",
  noneFiltered: "Nothing matches.",
  more: "Show more",
  loadFailed: "Could not load the activity.",
  change: (field: string, from: string, to: string) => `${field}: ${from} → ${to}`,
  moreChanges: (n: number) => plural(n, { one: "and # more change", other: "and # more changes" }),
};
