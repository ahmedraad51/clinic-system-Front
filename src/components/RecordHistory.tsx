"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { Button, Card, LoadError, Spinner } from "@/components/ui";
import { useSettings } from "@/context/SettingsContext";
import { errorMessage, getDocHistory } from "@/lib/frappe";
import { cx, formatDateTime } from "@/lib/format";
import {
  HISTORY_LIMIT, fieldLabel, historyValue, isEmptyValue, readableChanges, showsValues, type DocHistory,
} from "@/lib/history";

/**
 * Who created this record and who changed what, and when. Closed until someone asks, so the page stays calm and
 * nothing extra is loaded. `changedAt` (the record's `modified`) loads it again after a save on the page.
 */
export default function RecordHistory({
  doctype,
  name,
  changedAt,
  startOpen = false,
}: {
  doctype: string;
  name: string;
  changedAt?: string;
  startOpen?: boolean;
}) {
  const { money } = useSettings();
  const [open, setOpen] = useState(startOpen);
  const [history, setHistory] = useState<{ key: string; data: DocHistory } | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const key = `${doctype}|${name}|${changedAt ?? ""}|${version}`;

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getDocHistory(doctype, name);
        if (!cancelled) {
          setHistory({ key, data });
          setError("");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(errorMessage(err, "Could not load the history."));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, doctype, name, key]);

  const data = history?.key === key ? history.data : null;
  // A save that only touched fields the server works out has nothing to show.
  const entries = (data?.entries ?? [])
    .map((entry) => ({ ...entry, changes: readableChanges(doctype, entry.changes) }))
    .filter((entry) => entry.changes.length > 0);

  const body = !open ? (
    <p className="text-sm text-gray-500">Who added this record, and who changed what and when.</p>
  ) : error ? (
    <LoadError
      message={error}
      onRetry={() => {
        setError("");
        setVersion((v) => v + 1);
      }}
    />
  ) : !data ? (
    <p role="status" className="flex items-center gap-2 text-sm text-gray-500">
      <Spinner size={16} />
      Loading...
    </p>
  ) : (
    <ol className="relative ms-1.5 border-s border-gray-200 space-y-5">
      {entries.map((entry) => (
        <li key={entry.name} className="relative ps-5">
          <span className="absolute -start-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary-300" aria-hidden="true" />
          <p className="text-sm font-medium text-gray-800 break-words">
            {entry.userName} <span className="font-normal text-gray-500">changed it · {formatDateTime(entry.at.slice(0, 19))}</span>
          </p>
          <ul className="mt-1 space-y-0.5">
            {entry.changes.map((change) => (
              <li key={change.field} className="text-sm text-gray-700 break-words whitespace-pre-line">
                <span className="text-gray-500">{fieldLabel(doctype, change.field)}:</span>{" "}
                {showsValues(change.field) ? (
                  <>
                    <span className={cx("text-gray-500", !isEmptyValue(change.from) && "line-through decoration-gray-300")}>
                      {historyValue(change.field, change.from, money)}
                    </span>
                    {" → "}
                    {historyValue(change.field, change.to, money)}
                  </>
                ) : (
                  "updated"
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
      {data.entries.length >= HISTORY_LIMIT && (
        <li className="ps-5 text-xs text-gray-500">
          {entries.length === 0
            ? `Nothing to show in the last ${HISTORY_LIMIT} saves (they only updated totals); earlier changes are not shown.`
            : `Only the last ${HISTORY_LIMIT} saves are looked at; earlier changes are not shown.`}
        </li>
      )}
      <li className="relative ps-5">
        <span className="absolute -start-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-300" aria-hidden="true" />
        <p className="text-sm font-medium text-gray-800 break-words">
          {data.createdByName || "Someone"}{" "}
          <span className="font-normal text-gray-500">
            added it{data.createdAt ? ` · ${formatDateTime(data.createdAt.slice(0, 19))}` : ""}
          </span>
        </p>
        {entries.length === 0 && data.entries.length < HISTORY_LIMIT && (
          <p className="text-sm text-gray-500 mt-1">No changes since then.</p>
        )}
      </li>
    </ol>
  );

  const showButton = !open && (
    <Button size="sm" variant="secondary" icon={History} onClick={() => setOpen(true)}>
      Show History
    </Button>
  );

  return (
    <Card title="History" icon={History} actions={showButton} className="print:hidden">
      {body}
    </Card>
  );
}
