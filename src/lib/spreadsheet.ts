import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { csvSafe } from "./format";

/**
 * Plain tables in and out: CSV and Excel (.xlsx) files read for importing patients, and written (with ZIP) for the
 * data export. Only what a table needs: text and numbers, the first sheet, no formulas or formatting.
 */

export type Cell = string | number | null | undefined;

/** The file is not a CSV or an .xlsx (an old .xls, a PDF …), or it could not be read. */
export class UnreadableFileError extends Error {
  constructor(public readonly reason: "type" | "broken") {
    super(reason);
    this.name = "UnreadableFileError";
  }
}

/** The rows of a CSV or .xlsx file (the first sheet), every cell as text, empty rows left out. */
export async function readTable(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  let rows: string[][];
  if (name.endsWith(".xlsx") || isZip(bytes)) rows = readXlsx(bytes);
  else if (name.endsWith(".csv") || name.endsWith(".txt") || file.type.startsWith("text/")) rows = parseCsv(decodeText(bytes));
  else throw new UnreadableFileError("type");
  return rows.filter((row) => row.some((cell) => cell.trim() !== ""));
}

const isZip = (bytes: Uint8Array) => bytes[0] === 0x50 && bytes[1] === 0x4b;

/**
 * Text in UTF-8, or else in Windows-1256: Excel's "CSV" on an Arabic Windows saves in that, and UTF-8 would turn
 * every Arabic letter into "?".
 */
export function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1256").decode(bytes);
  }
}

/** A CSV in rows: the separator (comma, semicolon or tab) is guessed from the first line; quotes are understood. */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const separator = [",", ";", "\t"].map((s) => [s, firstLine.split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === "") quoted = true;
    else if (char === separator) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/* --- Excel (.xlsx): a ZIP of XML files ---------------------------------------------------------------------------- */

function xml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}

/** "AB12" → 27 (the column, from 0). */
function columnIndex(ref: string): number {
  let n = 0;
  for (const char of ref.replace(/\d+$/, "")) n = n * 26 + (char.charCodeAt(0) - 64);
  return n - 1;
}

/** The first sheet of an .xlsx file, every cell as text (numbers as Excel stores them: a date is a day number). */
export function readXlsx(bytes: Uint8Array): string[][] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new UnreadableFileError("broken");
  }
  const text = (path: string) => (files[path] ? strFromU8(files[path]) : "");
  // The first sheet named in the workbook, through the workbook's links.
  const workbook = xml(text("xl/workbook.xml"));
  const firstSheet = workbook.getElementsByTagName("sheet")[0];
  const relId = firstSheet?.getAttribute("r:id") ?? firstSheet?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
  let sheetPath = "xl/worksheets/sheet1.xml";
  for (const rel of Array.from(xml(text("xl/_rels/workbook.xml.rels")).getElementsByTagName("Relationship"))) {
    if (rel.getAttribute("Id") === relId) {
      const target = rel.getAttribute("Target") ?? "";
      sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    }
  }
  if (!files[sheetPath]) throw new UnreadableFileError("broken");
  const shared = Array.from(xml(text("xl/sharedStrings.xml")).getElementsByTagName("si")).map((si) =>
    Array.from(si.getElementsByTagName("t"))
      .map((t) => t.textContent ?? "")
      .join(""),
  );
  const rows: string[][] = [];
  for (const rowEl of Array.from(xml(text(sheetPath)).getElementsByTagName("row"))) {
    const row: string[] = [];
    for (const c of Array.from(rowEl.getElementsByTagName("c"))) {
      const index = columnIndex(c.getAttribute("r") ?? "A1");
      const type = c.getAttribute("t");
      const value = c.getElementsByTagName("v")[0]?.textContent ?? "";
      let cell: string;
      if (type === "s") cell = shared[Number(value)] ?? "";
      else if (type === "inlineStr") cell = Array.from(c.getElementsByTagName("t")).map((t) => t.textContent ?? "").join("");
      else if (type === "b") cell = value === "1" ? "TRUE" : "FALSE";
      else cell = value;
      while (row.length < index) row.push("");
      row[index] = cell;
    }
    rows.push(row);
  }
  return rows;
}

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

/**
 * A one-sheet .xlsx file: numbers as numbers, everything else as text (a text that starts with = + - @ gets a leading
 * ' like the CSV export, so it is never run as a formula). The first row is bold and frozen; `rightToLeft` shows the
 * sheet from right to left (Arabic).
 */
export function writeXlsx(sheetName: string, rows: Cell[][], { rightToLeft = false } = {}): Uint8Array {
  const sheetRows = rows
    .map((row, r) => {
      const cells = row
        .map((cell, c) => {
          if (cell === null || cell === undefined || cell === "") return "";
          const ref = `${columnName(c)}${r + 1}`;
          const style = r === 0 ? ' s="1"' : "";
          if (typeof cell === "number" && Number.isFinite(cell)) return `<c r="${ref}"${style}><v>${cell}</v></c>`;
          return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(csvSafe(cell))}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");
  const files: Record<string, string> = {
    "[Content_Types].xml":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    "_rels/.rels":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    "xl/styles.xml":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>',
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"${rightToLeft ? ' rightToLeft="1"' : ""}><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${sheetRows}</sheetData></worksheet>`,
  };
  return zipSync(Object.fromEntries(Object.entries(files).map(([path, content]) => [path, strToU8(content)])));
}

/** A CSV file's bytes: UTF-8 with a BOM (so Excel shows Arabic right), formulas made harmless (csvSafe). */
export function writeCsv(rows: Cell[][]): Uint8Array {
  const escape = (cell: Cell) => {
    if (cell === null || cell === undefined) return "";
    const text = csvSafe(cell);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return strToU8("\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\r\n"));
}

/** Several files in one ZIP. */
export function zipFiles(files: Record<string, Uint8Array>): Uint8Array {
  return zipSync(files);
}

/** Saves bytes as a file on this computer (the browser's download). */
export function downloadBytes(bytes: Uint8Array, filename: string, type: string): void {
  const blob = new Blob([bytes as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
