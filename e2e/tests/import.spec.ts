import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";
import { checkRows, guessColumns, readDate, readGender } from "../../src/lib/patientImport";
import { decodeText, parseCsv, writeXlsx } from "../../src/lib/spreadsheet";

test("columns are recognised in English and Arabic, and cells are read", () => {
  expect(guessColumns(["الاسم", "رقم الهاتف", "الجنس", "تاريخ الميلاد", "Notes", "Something"])).toEqual([
    "full_name",
    "phone_number",
    "gender",
    "date_of_birth",
    "notes",
    null,
  ]);
  expect(guessColumns(["Patient Name", "Mobile", "Phone 2", "DOB", "Allergy"])).toEqual([
    "full_name",
    "phone_number",
    "secondary_phone",
    "date_of_birth",
    "allergies",
  ]);
  expect(readDate("12/04/1991")).toBe("1991-04-12");
  expect(readDate("1991-4-12")).toBe("1991-04-12");
  expect(readDate("١٢/٠٤/١٩٩١")).toBe("1991-04-12");
  // Excel keeps a date as a day number.
  expect(readDate("33340")).toBe("1991-04-12");
  expect(readDate("31/02/1991")).toBeNull();
  expect(readGender("أنثى")).toBe("Female");
  expect(readGender("M")).toBe("Male");
  expect(readGender("?")).toBe("");

  // A phone already registered, and one repeated in the file.
  const rows = checkRows(
    [
      ["Ali", "0770 111 2222"],
      ["Sara", "+964 770 234 5678"],
      ["Ali again", "07701112222"],
      ["", "0780 000 0000"],
    ],
    ["full_name", "phone_number"],
    [{ name: "PAT-1", full_name: "زهراء حسين", phone_number: "0770 234 5678" }],
  );
  expect(rows.map((row) => row.state)).toEqual(["ok", "existing", "repeated", "noName"]);
  expect(rows[1].match).toBe("زهراء حسين (PAT-1)");
  expect(rows[2].match).toBe("2");
});

test("a CSV saved by Excel on an Arabic Windows (not UTF-8) is read correctly", () => {
  // "الاسم;الهاتف" then a row, in Windows-1256 with semicolons, as Excel saves "CSV" there.
  const bytes = new Uint8Array([0xc7, 0xe1, 0xc7, 0xd3, 0xe3, 0x3b, 0xc7, 0xe1, 0xe5, 0xc7, 0xca, 0xdd, 0x0d, 0x0a, 0x41, 0x3b, 0x31]);
  expect(parseCsv(decodeText(bytes))).toEqual([
    ["الاسم", "الهاتف"],
    ["A", "1"],
  ]);
  expect(parseCsv('name,notes\n"Hassan, Ali","said ""hi"""\n')).toEqual([
    ["name", "notes"],
    ["Hassan, Ali", 'said "hi"'],
  ]);
});

test("patients are imported from an Excel file, and duplicates are skipped with a report", async ({ page }) => {
  await page.goto("/patients");
  await waitForData(page);
  await page.getByRole("link", { name: "Import" }).click();
  await expect(page.getByRole("heading", { name: "Import Patients" })).toBeVisible();

  const file = writeXlsx("Patients", [
    ["الاسم", "رقم الهاتف", "الجنس", "تاريخ الميلاد", "الحساسية"],
    ["سلمى عادل", "0771 900 1001", "أنثى", 33340, "البنسلين"],
    ["كرار حيدر", "0782 900 1002", "ذكر", "", ""],
    // The same mobile number as زهراء حسين, already a patient.
    ["زهراء ح.", "0770 234 5678", "أنثى", "", ""],
    // Repeats the first row's number.
    ["سلمى", "07719001001", "", "", ""],
    ["", "0790 900 1005", "", "", ""],
  ]);
  await page.getByLabel("Spreadsheet file").setInputFiles({
    name: "patients.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(file),
  });

  // The columns were recognised from the Arabic headers.
  await expect(page.getByRole("heading", { name: "Match the Columns" })).toBeVisible();
  await expect(page.getByText("patients.xlsx · 5 rows")).toBeVisible();
  await expect(page.locator('select[name="column_0"]')).toHaveValue("full_name");
  await expect(page.locator('select[name="column_1"]')).toHaveValue("phone_number");
  await expect(page.locator('select[name="column_3"]')).toHaveValue("date_of_birth");
  await page.getByRole("button", { name: "Continue" }).click();

  const counts = page.getByTestId("import-counts");
  await expect(counts).toContainText("2 patients ready to import");
  await expect(counts).toContainText("1 already registered (same mobile number)");
  await expect(counts).toContainText("1 repeated in the file");
  await expect(counts).toContainText("1 with a problem");
  await expect(page.locator('[data-row="2"]')).toContainText("12 Apr 1991");
  await expect(page.locator('[data-row="4"]')).toContainText("Same number as زهراء حسين (PAT-2026-00001)");

  await page.getByRole("button", { name: "Import 2 Patients" }).click();
  await expect(page.getByTestId("import-result")).toHaveText("2 patients imported.");
  await expect(page.getByText("3 rows skipped:")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download the Skipped Rows" }).click();
  expect((await download).suggestedFilename()).toBe("skipped-patients.csv");

  // They are patients now, with what the file said.
  await page.getByRole("link", { name: "Go to Patients" }).click();
  await page.getByPlaceholder(/Search/).fill("سلمى عادل");
  await page.getByRole("link", { name: "سلمى عادل" }).click();
  await expect(page.getByText("البنسلين").first()).toBeVisible();
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("importing a CSV in Arabic, with a missing column chosen by hand", async ({ page }) => {
    await page.goto("/patients/import");
    await waitForData(page);
    await expect(page.getByRole("heading", { name: "استيراد المرضى" })).toBeVisible();
    await page.getByLabel("ملف الجدول").setInputFiles({
      name: "مرضى.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("Name,Contact\nعلي سالم,0773 555 0101\n", "utf8"),
    });
    // "Contact" is not recognised: the import waits for the mobile column.
    await expect(page.getByText("اختر العمودين اللذين فيهما اسم المريض ورقم الموبايل.")).toBeVisible();
    await page.locator('select[name="column_1"]').selectOption("phone_number");
    await page.getByRole("button", { name: "متابعة" }).click();
    await page.getByRole("button", { name: "استيراد مريض واحد" }).click();
    await expect(page.getByTestId("import-result")).toHaveText("استُورد مريض واحد.");
  });
});
