"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { Button, Card, LoadError, Spinner } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { messages } from "@/i18n";
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
  const { t } = useI18n();
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
        if (!cancelled) setError(errorMessage(err, messages().history.loadFailed));
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
    <p className="text-sm text-gray-500">{t.history.intro}</p>
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
      {t.history.loading}
    </p>
  ) : (
    <ol className="relative ms-1.5 border-s border-gray-200 space-y-5">
      {entries.map((entry) => (
        <li key={entry.name} className="relative ps-5">
          <span className="absolute -start-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary-300" aria-hidden="true" />
          <p className="text-sm font-medium text-gray-800 break-words">
            {entry.userName} <span className="font-normal text-gray-500">
              {t.history.changedIt}
              {t.history.at(formatDateTime(entry.at.slice(0, 19)))}
            </span>
          </p>
          <ul className="mt-1 space-y-0.5">
            {entry.changes.map((change) => (
              <li key={change.field} className="text-sm text-gray-700 break-words whitespace-pre-line">
                <span className="text-gray-500">{fieldLabel(doctype, change.field)}:</span>{" "}
                {showsValues(change.field) ? (
                  <>
                    <bdi className={cx("text-gray-500", !isEmptyValue(change.from) && "line-through decoration-gray-300")}>
                      {historyValue(change.field, change.from, money, doctype)}
                    </bdi>
                    {t.history.arrow}
                    <bdi>{historyValue(change.field, change.to, money, doctype)}</bdi>
                  </>
                ) : (
                  t.history.updated
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
      {data.entries.length >= HISTORY_LIMIT && (
        <li className="ps-5 text-xs text-gray-500">
          {entries.length === 0
            ? t.history.nothingInLast(HISTORY_LIMIT)
            : t.history.onlyLast(HISTORY_LIMIT)}
        </li>
      )}
      <li className="relative ps-5">
        <span className="absolute -start-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-300" aria-hidden="true" />
        <p className="text-sm font-medium text-gray-800 break-words">
          {data.createdByName || t.history.someone}{" "}
          <span className="font-normal text-gray-500">
            {t.history.addedIt}
            {data.createdAt ? t.history.at(formatDateTime(data.createdAt.slice(0, 19))) : ""}
          </span>
        </p>
        {entries.length === 0 && data.entries.length < HISTORY_LIMIT && (
          <p className="text-sm text-gray-500 mt-1">{t.history.noChanges}</p>
        )}
      </li>
    </ol>
  );

  const showButton = !open && (
    <Button size="sm" variant="secondary" icon={History} onClick={() => setOpen(true)}>
      {t.history.showHistory}
    </Button>
  );

  return (
    <Card title={t.history.title} icon={History} actions={showButton} className="print:hidden">
      {body}
    </Card>
  );
}
