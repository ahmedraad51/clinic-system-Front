"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Pencil, Plus, RotateCcw, Trash2, type LucideIcon } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Badge, Button, Card, EmptyState, hueClass, LoadError, PageContainer, PageHeader, PageLoading, SelectInput, Toolbar, type Hue,
} from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { label, messages } from "@/i18n";
import {
  ACTIVITY_DOCTYPES, ACTIVITY_KINDS, mergeActivity, recordHref, TITLE_FIELDS,
  type ActivityEntry, type ActivityKind, type DeletedDocument, type VersionDoc,
} from "@/lib/activity";
import { bumpData, useDataVersion } from "@/lib/dataVersion";
import { errorMessage, getList, restoreDeleted, type FilterRow } from "@/lib/frappe";
import { cx, formatDateTime } from "@/lib/format";
import { fieldLabel, historyValue } from "@/lib/history";
import type { User } from "@/lib/types";

/** How many entries a page of the log shows; Show More adds as many again. */
const STEP = 40;

export default function ActivityPage() {
  return (
    <RequirePermission permission="manage_users">
      <ActivityLog />
    </RequirePermission>
  );
}

const KIND_LOOK: Record<ActivityKind, { icon: LucideIcon; hue: Hue }> = {
  added: { icon: Plus, hue: "green" },
  changed: { icon: Pencil, hue: "blue" },
  deleted: { icon: Trash2, hue: "red" },
};

interface Loaded {
  key: string;
  entries: ActivityEntry[];
  users: Record<string, string>;
  /** Whether any source had more than was shown. */
  more: boolean;
}

/**
 * The activity log for managers: who added, changed and deleted which record, newest first, filtered by what
 * happened and by the kind of record. A deleted record has Restore, which puts it back under its old name.
 */
function ActivityLog() {
  const { t } = useI18n();
  const a = t.activity;
  const toast = useToast();
  const { money } = useSettings();
  const [kind, setKind] = useState<"all" | ActivityKind>("all");
  const [doctype, setDoctype] = useState("");
  const [limit, setLimit] = useState(STEP);
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState("");
  const [version, setVersion] = useState(0);
  const [restoring, setRestoring] = useState<string | null>(null);
  const saved = useDataVersion();
  const key = `${kind}|${doctype}|${limit}`;

  useEffect(() => {
    let cancelled = false;
    const [kindPart, typePart, limitPart] = key.split("|");
    const size = Number(limitPart);
    const wants = (what: ActivityKind) => kindPart === "all" || kindPart === what;
    const doctypes = typePart ? [typePart] : [...ACTIVITY_DOCTYPES];
    const load = async () => {
      try {
        const [added, versions, deleted, users] = await Promise.all([
          // Added: the newest records of each kind (also used to name the records that were changed).
          Promise.all(
            doctypes.map(async (dt) => ({
              doctype: dt,
              rows:
                wants("added") || wants("changed")
                  ? await getList<Record<string, unknown> & { name: string }>(
                      dt,
                      ["name", "owner", "creation", ...TITLE_FIELDS[dt as keyof typeof TITLE_FIELDS]],
                      { orderBy: "creation desc", limit: size },
                    )
                  : [],
            })),
          ),
          wants("changed")
            ? getList<VersionDoc>("Version", ["name", "ref_doctype", "docname", "data", "owner", "creation"], {
                filters: [["ref_doctype", "in", doctypes] as FilterRow],
                orderBy: "creation desc",
                limit: size,
              })
            : Promise.resolve([] as VersionDoc[]),
          wants("deleted")
            ? getList<DeletedDocument>(
                "Deleted Document",
                ["name", "deleted_doctype", "deleted_name", "data", "restored", "new_name", "owner", "creation"],
                { filters: [["deleted_doctype", "in", doctypes] as FilterRow], orderBy: "creation desc", limit: size },
              )
            : Promise.resolve([] as DeletedDocument[]),
          getList<User>("User", ["name", "full_name"], { limit: 0 }).catch(() => [] as User[]),
        ]);
        // The newest records also name the changed ones, when only changes are shown.
        const entries = mergeActivity(added, versions, deleted, size, wants("added"));
        const more = [...added.map((group) => group.rows.length), versions.length, deleted.length].some((count) => count >= size);
        if (!cancelled) {
          setData({ key, entries, users: Object.fromEntries(users.map((user) => [user.name, user.full_name || user.name])), more });
          setFailed("");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setFailed(errorMessage(err, messages().activity.loadFailed));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [key, version, saved]);

  const restore = async (entry: ActivityEntry) => {
    if (!entry.deleted) return;
    setRestoring(entry.key);
    try {
      await restoreDeleted(entry.deleted.name);
      toast.success(a.restoredToast(`${label(t.enums.doctype, entry.doctype)} ${entry.title || entry.name}`));
      bumpData();
    } catch (err) {
      toast.error(errorMessage(err, a.restoreFailed));
    } finally {
      setRestoring(null);
    }
  };

  const who = (user: string) => (user ? data?.users[user] || user : a.someone);
  const filtered = kind !== "all" || doctype !== "";

  return (
    <PageContainer section="system">
      <PageHeader icon={History} section="system" title={a.title} subtitle={a.subtitle} />

      <Toolbar>
        <SelectInput
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as "all" | ActivityKind);
            setLimit(STEP);
          }}
          className="sm:w-48"
          aria-label={a.kindFilter}
        >
          <option value="all">{a.kinds.all}</option>
          {ACTIVITY_KINDS.map((value) => (
            <option key={value} value={value}>
              {a.kinds[value]}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          value={doctype}
          onChange={(event) => {
            setDoctype(event.target.value);
            setLimit(STEP);
          }}
          className="sm:w-56"
          aria-label={a.typeFilter}
        >
          <option value="">{a.allTypes}</option>
          {ACTIVITY_DOCTYPES.map((value) => (
            <option key={value} value={value}>
              {label(t.enums.doctype, value)}
            </option>
          ))}
        </SelectInput>
      </Toolbar>

      {failed && (
        <LoadError
          message={failed}
          onRetry={() => {
            setFailed("");
            setVersion((v) => v + 1);
          }}
        />
      )}

      {!data ? (
        !failed && <PageLoading />
      ) : (
        <Card flush>
          {data.entries.length === 0 ? (
            <EmptyState icon={History} title={filtered ? a.noneFiltered : a.none} />
          ) : (
            <ul className={cx("divide-y divide-gray-200", data.key !== key && "opacity-60")} aria-label={a.title}>
              {data.entries.map((entry) => {
                const look = KIND_LOOK[entry.kind];
                const Icon = look.icon;
                const restored = Number(entry.deleted?.restored) === 1;
                const href = entry.kind === "deleted" && !restored ? null : recordHref(entry.doctype, entry.deleted?.new_name || entry.name);
                const what = (
                  <>
                    {label(t.enums.doctype, entry.doctype)}{" "}
                    {href ? (
                      <Link href={href} className="font-medium text-gray-900 hover:text-primary-600">
                        <bdi>{entry.title || entry.name}</bdi>
                      </Link>
                    ) : (
                      <bdi className="font-medium text-gray-900">{entry.title || entry.name}</bdi>
                    )}
                  </>
                );
                return (
                  <li key={entry.key} data-testid="activity-entry" className="flex items-start gap-4 px-5 sm:px-6 py-4">
                    <span className={cx("mt-0.5 w-9 h-9 shrink-0 rounded-md flex items-center justify-center bg-sec-soft text-sec", hueClass(look.hue))}>
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium text-gray-900">{who(entry.user)}</span> {a.verbs[entry.kind]} {what}
                        {" "}
                        {/* Isolated, so a Latin title, a date and the ID keep their order on an Arabic screen. */}
                        <bdi className="text-gray-500 whitespace-nowrap">({entry.name})</bdi>
                      </p>
                      {entry.changes.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
                          {entry.changes.slice(0, 3).map((change) => (
                            <li key={change.field}>
                              {a.change(
                                fieldLabel(entry.doctype, change.field),
                                historyValue(change.field, change.from, money, entry.doctype),
                                historyValue(change.field, change.to, money, entry.doctype),
                              )}
                            </li>
                          ))}
                          {entry.changes.length > 3 && <li>{a.moreChanges(entry.changes.length - 3)}</li>}
                        </ul>
                      )}
                      <p className="mt-1 text-xs text-gray-500">{formatDateTime(entry.at.slice(0, 19))}</p>
                    </div>
                    {entry.deleted &&
                      (restored ? (
                        <Badge tone="green">{entry.deleted.new_name && entry.deleted.new_name !== entry.name ? a.restoredAs(entry.deleted.new_name) : a.restored}</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={RotateCcw}
                          loading={restoring === entry.key}
                          disabled={restoring !== null}
                          onClick={() => restore(entry)}
                          aria-label={`${a.restore}: ${label(t.enums.doctype, entry.doctype)} ${entry.title || entry.name}`}
                        >
                          {a.restore}
                        </Button>
                      ))}
                  </li>
                );
              })}
            </ul>
          )}
          {data.more && data.entries.length >= limit && (
            <div className="px-5 sm:px-6 py-4 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setLimit((n) => n + STEP)}>
                {a.more}
              </Button>
            </div>
          )}
        </Card>
      )}
    </PageContainer>
  );
}
