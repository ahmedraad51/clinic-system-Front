"use client";

import { useState } from "react";
import { strToU8 } from "fflate";
import { Archive, Check, Download } from "lucide-react";
import RequirePermission from "@/components/Guard";
import { Alert, Button, Card, Field, PageContainer, PageHeader, Segmented, Spinner } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { EXPORTS, NUMBER_FIELDS, type ExportKind } from "@/lib/exportData";
import { formatDateTime, nowDateTime, todayISO } from "@/lib/format";
import { errorMessage, getList } from "@/lib/frappe";
import { fieldLabel } from "@/lib/history";
import { downloadBytes, writeCsv, writeXlsx, zipFiles, type Cell } from "@/lib/spreadsheet";

type Format = "xlsx" | "csv";
type Progress = Partial<Record<ExportKind["key"], number>>;

export default function ExportPage() {
  return (
    <RequirePermission permission="manage_users">
      <ExportData />
    </RequirePermission>
  );
}

/**
 * Every patient, appointment, treatment plan and payment as Excel workbooks or CSV files in one ZIP, with a short
 * README. Reading only, so it works on the view-only cloud copy too.
 */
function ExportData() {
  const { t, lang } = useI18n();
  const x = t.exporter;
  const { displayName } = useSession();
  const { clinicName } = useSettings();
  const [format, setFormat] = useState<Format>("xlsx");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress>({});
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const run = async () => {
    setRunning(true);
    setError("");
    setDone(false);
    setProgress({});
    try {
      const files: Record<string, Uint8Array> = {};
      const counts: string[] = [];
      for (const kind of EXPORTS) {
        const rows = await getList<Record<string, unknown> & { name: string }>(kind.doctype, kind.fields, { orderBy: kind.orderBy, limit: 0 });
        const header = kind.fields.map((field) => (field === "name" ? x.id : fieldLabel(kind.doctype, field)));
        const table: Cell[][] = [
          header,
          ...rows.map((row) =>
            kind.fields.map((field) => {
              const value = row[field];
              if (value === null || value === undefined) return "";
              if (NUMBER_FIELDS.has(field) && value !== "") return Number(value);
              return typeof value === "object" ? JSON.stringify(value) : String(value);
            }),
          ),
        ];
        files[`${kind.key}.${format}`] =
          format === "xlsx" ? writeXlsx(x.kinds[kind.key], table, { rightToLeft: lang === "ar" }) : writeCsv(table);
        counts.push(x.readmeLine(x.kinds[kind.key], rows.length));
        setProgress((current) => ({ ...current, [kind.key]: rows.length }));
      }
      files[x.readmeName] = strToU8(x.readme(clinicName, formatDateTime(nowDateTime()), displayName, counts.join("\n")));
      downloadBytes(zipFiles(files), `dentclinic-${todayISO()}.zip`, "application/zip");
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, x.failed));
    } finally {
      setRunning(false);
    }
  };

  return (
    <PageContainer narrow>
      <PageHeader title={x.title} subtitle={x.subtitle} />
      <Card title={x.cardTitle} icon={Archive}>
        <div className="space-y-5">
          <p className="text-sm text-gray-700">{x.text}</p>
          <Field label={x.format} hint={x.formatHint}>
            <Segmented
              label={x.format}
              value={format}
              onChange={(value) => setFormat(value as Format)}
              options={[
                { value: "xlsx", label: x.formats.xlsx },
                { value: "csv", label: x.formats.csv },
              ]}
            />
          </Field>
          <ul className="divide-y divide-gray-200 rounded-md border border-gray-200" data-testid="export-progress">
            {EXPORTS.map((kind) => {
              const count = progress[kind.key];
              return (
                <li key={kind.key} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="font-medium text-gray-900">{x.kinds[kind.key]}</span>
                  <span className="flex items-center gap-2 text-gray-600">
                    {count !== undefined ? (
                      <>
                        <Check size={16} className="text-green-700" aria-hidden="true" />
                        {x.rows(count)}
                      </>
                    ) : running ? (
                      <Spinner size={14} />
                    ) : (
                      x.waiting
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <Alert tone="yellow">{x.privacyNote}</Alert>
          {error && <Alert tone="red">{error}</Alert>}
          {done && <Alert tone="blue">{x.done}</Alert>}
          <Button icon={Download} loading={running} onClick={run}>
            {running ? x.preparing : x.download}
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}
