"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert, Badge, Button, Card, LinkButton, PageContainer, PageHeader, ProgressBar, SelectInput, Table, Td, Th, Toggle,
  type Tone,
} from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { bumpData } from "@/lib/dataVersion";
import { cx, formatDate } from "@/lib/format";
import { createDoc, errorMessage, getList } from "@/lib/frappe";
import {
  checkRows, guessColumns, IMPORT_FIELDS, readGender, type ExistingPatient, type ImportField, type ImportRow, type RowState,
} from "@/lib/patientImport";
import { downloadBytes, readTable, UnreadableFileError, writeCsv } from "@/lib/spreadsheet";

/** The most rows one file may bring. */
const MAX_ROWS = 5000;
/** Rows shown in the check (all are imported). */
const SHOWN_ROWS = 100;
const STATE_TONES: Record<RowState, Tone> = {
  ok: "green",
  existing: "yellow",
  repeated: "yellow",
  noName: "red",
  noPhone: "red",
  badPhone: "red",
  badDate: "red",
};

export default function ImportPatientsPage() {
  return (
    <RequirePermission permission="add_patients">
      <ImportPatients />
    </RequirePermission>
  );
}

interface Loaded {
  fileName: string;
  headers: string[];
  rows: string[][];
}

interface Report {
  imported: number;
  skipped: Array<{ row: ImportRow; reason: string }>;
  stopped: boolean;
}

/**
 * Patients from an Excel (.xlsx) or CSV file: choose it, match its columns to the patient's fields (guessed from the
 * headers, in English or Arabic), check every row (a missing name or phone, a phone already registered, a phone
 * repeated in the file), then import with progress and a report of what was skipped.
 */
function ImportPatients() {
  const { t } = useI18n();
  const m = t.importer;
  const [stage, setStage] = useState<"file" | "columns" | "check" | "import">("file");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [columns, setColumns] = useState<Array<ImportField | null>>([]);
  const [existing, setExisting] = useState<ExistingPatient[] | null>(null);
  const [importExisting, setImportExisting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const stopRef = useRef(false);

  // The clinic's patients, to find numbers already registered (loaded once, before the check).
  useEffect(() => {
    if (stage !== "check" || existing) return;
    let cancelled = false;
    getList<ExistingPatient>("Patient", ["name", "full_name", "phone_number", "secondary_phone"], { limit: 0 })
      .then((rows) => !cancelled && setExisting(rows))
      .catch(() => !cancelled && setExisting([]));
    return () => {
      cancelled = true;
    };
  }, [stage, existing]);

  const checked = useMemo(
    () => (loaded && existing ? checkRows(loaded.rows, columns, existing) : null),
    [loaded, columns, existing],
  );
  const toImport = (checked ?? []).filter((row) => row.state === "ok" || (importExisting && row.state === "existing"));

  const reasonOf = (row: ImportRow) =>
    row.state === "existing" && row.match ? m.existingAs(row.match) : row.state === "repeated" && row.match ? m.repeatsRow(row.match) : m.states[row.state];

  const startImport = async () => {
    if (!checked) return;
    stopRef.current = false;
    setStage("import");
    setReport(null);
    const skipped: Report["skipped"] = checked.filter((row) => !toImport.includes(row)).map((row) => ({ row, reason: reasonOf(row) }));
    let imported = 0;
    setProgress({ done: 0, total: toImport.length });
    for (let i = 0; i < toImport.length; i++) {
      if (stopRef.current) break;
      const row = toImport[i];
      try {
        await createDoc("Patient", row.payload!);
        imported++;
      } catch (err) {
        skipped.push({ row, reason: `${m.failed}: ${errorMessage(err)}` });
      }
      setProgress({ done: i + 1, total: toImport.length });
    }
    skipped.sort((a, b) => a.row.line - b.row.line);
    bumpData();
    setReport({ imported, skipped, stopped: stopRef.current });
  };

  const restart = () => {
    setStage("file");
    setLoaded(null);
    setColumns([]);
    setExisting(null);
    setReport(null);
    setProgress(null);
    setImportExisting(false);
  };

  return (
    <PageContainer>
      <PageHeader title={m.title} subtitle={m.subtitle} back={{ href: "/patients", label: t.nav.patients }} />
      <ol aria-label={m.title} className="flex flex-wrap gap-2 mb-6">
        {(["file", "columns", "check", "import"] as const).map((key, index) => (
          <li
            key={key}
            aria-current={stage === key ? "step" : undefined}
            className={cx(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
              stage === key ? "bg-brand text-white font-medium" : "bg-gray-100 text-gray-700",
            )}
          >
            <span className="tabular-nums">{index + 1}</span>
            {m.steps[key]}
          </li>
        ))}
      </ol>

      {stage === "file" && (
        <FileStep
          onLoaded={(table) => {
            setLoaded(table);
            setColumns(guessColumns(table.headers));
            setStage("columns");
          }}
        />
      )}

      {stage === "columns" && loaded && (
        <Card title={m.columnsTitle} icon={FileSpreadsheet} flush>
          <div className="px-5 sm:px-6 pb-4 space-y-2">
            <p className="text-sm text-gray-600">{m.fileSummary(loaded.fileName, loaded.rows.length)}</p>
            <p className="text-sm text-gray-600">{m.columnsText}</p>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>{m.column}</Th>
                <Th>{m.example}</Th>
                <Th>{m.importAs}</Th>
              </tr>
            </thead>
            <tbody>
              {loaded.headers.map((header, index) => (
                <tr key={index}>
                  <Td>
                    <bdi className="font-medium text-gray-900">{header || `#${index + 1}`}</bdi>
                  </Td>
                  <Td label={m.example} className="text-gray-600">
                    <bdi>{loaded.rows.find((row) => (row[index] ?? "").trim())?.[index] ?? ""}</bdi>
                  </Td>
                  <Td label={m.importAs}>
                    <SelectInput
                      name={`column_${index}`}
                      aria-label={`${m.importAs}: ${header}`}
                      value={columns[index] ?? ""}
                      onChange={(e) => {
                        const field = (e.target.value || null) as ImportField | null;
                        // A field goes to one column: the other one that had it lets it go.
                        setColumns(columns.map((current, i) => (i === index ? field : current === field ? null : current)));
                      }}
                    >
                      <option value="">{m.skipColumn}</option>
                      {IMPORT_FIELDS.map((field) => (
                        <option key={field} value={field}>
                          {m.fields[field]}
                        </option>
                      ))}
                    </SelectInput>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="px-5 sm:px-6 py-5 space-y-4">
            {!(columns.includes("full_name") && columns.includes("phone_number")) && <Alert tone="yellow">{m.needNamePhone}</Alert>}
            <div className="flex flex-wrap gap-3">
              <Button disabled={!(columns.includes("full_name") && columns.includes("phone_number"))} onClick={() => setStage("check")}>
                {m.next}
              </Button>
              <Button variant="secondary" onClick={restart}>
                {m.back}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {stage === "check" && (
        <CheckStep
          rows={checked}
          importExisting={importExisting}
          onImportExisting={setImportExisting}
          count={toImport.length}
          reasonOf={reasonOf}
          onBack={() => setStage("columns")}
          onImport={startImport}
        />
      )}

      {stage === "import" && progress && (
        <Card title={report ? m.doneTitle : m.steps.import} icon={report ? CheckCircle2 : Upload}>
          {!report ? (
            <div className="space-y-4">
              <ProgressBar value={progress.total ? (progress.done / progress.total) * 100 : 100} label={m.importing(progress.done, progress.total)} />
              <Button variant="secondary" onClick={() => (stopRef.current = true)}>
                {m.stop}
              </Button>
            </div>
          ) : (
            <ImportReport report={report} onAgain={restart} />
          )}
        </Card>
      )}
    </PageContainer>
  );
}

/** Choosing (or dropping) the file, and a sample to start from. */
function FileStep({ onLoaded }: { onLoaded: (table: Loaded) => void }) {
  const { t } = useI18n();
  const m = t.importer;
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  const read = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setError("");
    try {
      const [headers = [], ...rows] = await readTable(file);
      if (rows.length === 0) setError(m.empty);
      else if (rows.length > MAX_ROWS) setError(m.tooMany(MAX_ROWS));
      else onLoaded({ fileName: file.name, headers: headers.map((h) => h.trim()), rows });
    } catch (err) {
      setError(err instanceof UnreadableFileError ? (err.reason === "type" ? m.wrongType : m.broken) : errorMessage(err));
    } finally {
      setReading(false);
    }
  };

  const sample = () => {
    const header = (["full_name", "phone_number", "gender", "date_of_birth", "allergies", "address"] as const).map((f) => m.fields[f]);
    downloadBytes(writeCsv([header, ...m.sampleRows]), "patients-sample.csv", "text/csv;charset=utf-8");
  };

  const drop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    read(event.dataTransfer.files[0]);
  };

  return (
    <Card title={m.fileTitle} icon={FileSpreadsheet}>
      <p className="text-sm text-gray-600">{m.fileText}</p>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={cx(
          "mt-4 rounded-md border-2 border-dashed p-8 flex flex-col items-center gap-3 text-center transition",
          over ? "border-primary-500 bg-primary-50" : "border-gray-300",
        )}
      >
        <Upload size={28} className="text-primary-600" aria-hidden="true" />
        <Button icon={FileSpreadsheet} loading={reading} onClick={() => inputRef.current?.click()}>
          {reading ? m.reading : m.chooseFile}
        </Button>
        <span className="text-sm text-gray-600">{m.dropHere}</span>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          aria-label={m.fileInput}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            read(file);
          }}
        />
      </div>
      {error && (
        <div className="mt-4">
          <Alert tone="red">{error}</Alert>
        </div>
      )}
      <div className="mt-4">
        <Button variant="ghost" size="sm" icon={Download} onClick={sample}>
          {m.sample}
        </Button>
      </div>
    </Card>
  );
}

/** Every row with its state, the counts, and whether to import numbers that are already registered. */
function CheckStep({
  rows,
  importExisting,
  onImportExisting,
  count,
  reasonOf,
  onBack,
  onImport,
}: {
  rows: ImportRow[] | null;
  importExisting: boolean;
  onImportExisting: (on: boolean) => void;
  count: number;
  reasonOf: (row: ImportRow) => string;
  onBack: () => void;
  onImport: () => void;
}) {
  const { t } = useI18n();
  const m = t.importer;
  if (!rows) return <Card title={m.checkTitle}>{m.reading}</Card>;
  const by = (states: RowState[]) => rows.filter((row) => states.includes(row.state)).length;
  const existingCount = by(["existing"]);
  return (
    <Card title={m.checkTitle} flush>
      <div className="px-5 sm:px-6 pb-4 space-y-4">
        <div className="flex flex-wrap gap-2" data-testid="import-counts">
          <Badge tone="green">{m.ready(by(["ok"]))}</Badge>
          {existingCount > 0 && <Badge tone="yellow">{m.existing(existingCount)}</Badge>}
          {by(["repeated"]) > 0 && <Badge tone="yellow">{m.repeated(by(["repeated"]))}</Badge>}
          {by(["noName", "noPhone", "badPhone", "badDate"]) > 0 && <Badge tone="red">{m.problems(by(["noName", "noPhone", "badPhone", "badDate"]))}</Badge>}
        </div>
        {existingCount > 0 && (
          <Toggle checked={importExisting} onChange={onImportExisting} label={m.importExisting} description={m.importExistingHint} />
        )}
        {rows.length > SHOWN_ROWS && <p className="text-sm text-gray-600">{m.showingFirst(SHOWN_ROWS, rows.length)}</p>}
      </div>
      <Table>
        <thead>
          <tr>
            <Th>{m.row}</Th>
            <Th>{m.fields.full_name}</Th>
            <Th>{m.fields.phone_number}</Th>
            <Th>{m.fields.gender}</Th>
            <Th>{m.fields.date_of_birth}</Th>
            <Th>{m.status}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, SHOWN_ROWS).map((row) => (
            <tr key={row.line} data-row={row.line}>
              <Td className="tabular-nums">{row.line}</Td>
              <Td label={m.fields.full_name}>
                <bdi>{row.values.full_name ?? ""}</bdi>
              </Td>
              <Td label={m.fields.phone_number}>
                <span dir="ltr">{row.values.phone_number ?? ""}</span>
              </Td>
              <Td label={m.fields.gender}>{row.values.gender ? (readGender(row.values.gender) ? t.enums.gender[readGender(row.values.gender) as "Male" | "Female"] : row.values.gender) : ""}</Td>
              <Td label={m.fields.date_of_birth}>{row.payload?.date_of_birth ? formatDate(String(row.payload.date_of_birth)) : (row.values.date_of_birth ?? "")}</Td>
              <Td label={m.status}>
                <Badge tone={row.state === "existing" && importExisting ? "green" : STATE_TONES[row.state]}>{m.states[row.state]}</Badge>
                {row.state !== "ok" && row.match && <span className="block text-xs text-gray-600 mt-1">{reasonOf(row)}</span>}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="px-5 sm:px-6 py-5 space-y-4">
        {count === 0 && <Alert tone="yellow">{m.nothingToImport}</Alert>}
        <div className="flex flex-wrap gap-3">
          <Button icon={Upload} disabled={count === 0} onClick={onImport}>
            {m.startImport(count)}
          </Button>
          <Button variant="secondary" onClick={onBack}>
            {m.back}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** How many were imported, and every skipped row with why (and as a file to fix and import again). */
function ImportReport({ report, onAgain }: { report: Report; onAgain: () => void }) {
  const { t } = useI18n();
  const m = t.importer;
  const download = () => {
    const header = [m.row, ...IMPORT_FIELDS.map((f) => m.fields[f]), m.reason];
    const rows = report.skipped.map(({ row, reason }) => [row.line, ...IMPORT_FIELDS.map((f) => row.values[f] ?? ""), reason]);
    downloadBytes(writeCsv([header, ...rows]), m.skippedFile, "text/csv;charset=utf-8");
  };
  return (
    <div className="space-y-4">
      {report.stopped && <Alert tone="yellow">{m.stopped}</Alert>}
      <p className="text-lg font-semibold text-gray-900" data-testid="import-result">
        {m.imported(report.imported)}
      </p>
      <p className="text-sm text-gray-700">{m.skipped(report.skipped.length)}</p>
      {report.skipped.length > 0 && (
        <>
          <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 text-sm" data-testid="import-skipped">
            {report.skipped.slice(0, SHOWN_ROWS).map(({ row, reason }) => (
              <li key={row.line} className="px-4 py-2 flex flex-wrap gap-x-3">
                <span className="text-gray-600 tabular-nums">
                  {m.row} {row.line}
                </span>
                <bdi className="font-medium text-gray-900">{row.values.full_name || "—"}</bdi>
                <span className="text-gray-700">{reason}</span>
              </li>
            ))}
          </ul>
          <Button variant="secondary" icon={Download} onClick={download}>
            {m.downloadSkipped}
          </Button>
        </>
      )}
      <div className="flex flex-wrap gap-3 pt-2">
        <LinkButton href="/patients">{m.goPatients}</LinkButton>
        <Button variant="secondary" onClick={onAgain}>
          {m.again}
        </Button>
      </div>
    </div>
  );
}
