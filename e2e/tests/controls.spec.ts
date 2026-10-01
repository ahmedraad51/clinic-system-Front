import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { navigate, pickLink, waitForData } from "../helpers";

/**
 * The app's own form controls (src/components/ui: Select, DateInput, TimeInput, SuggestInput, ColorInput, Popover)
 * instead of the browser's: lists with a check mark and a search box, keys, a calendar with Arabic month names, a
 * time picker, our own "fill in this field" message, and a sheet from the bottom on a phone.
 */

async function openPatientDialog(page: Page, testId: string) {
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByTestId(testId).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test("a dropdown is the app's own list: check mark, keys, pictures, and Escape keeps the dialog open", async ({ page }) => {
  await openPatientDialog(page, "open-new-treatment");
  const dialog = page.getByRole("dialog");
  await page.locator('[data-picker="doctor"]').click();
  const list = page.getByRole("listbox", { name: "Doctor" });
  await expect(list).toBeVisible();
  // The empty choice is the chosen one, with its check mark; each doctor has initials before the name.
  await expect(list.getByRole("option", { name: "Select Doctor" })).toHaveAttribute("aria-selected", "true");
  await expect(list.getByRole("option", { name: /Dr\. Ali Al-Jubouri/ }).locator("[data-avatar]")).toBeVisible();

  // Escape closes the list only.
  await page.keyboard.press("Escape");
  await expect(list).toHaveCount(0);
  await expect(dialog).toBeVisible();

  // Keyboard: Down opens it again, Down moves, Enter chooses.
  await page.getByLabel("Doctor").focus();
  await page.keyboard.press("ArrowDown");
  await expect(list).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(list).toHaveCount(0);
  await expect(page.getByLabel("Doctor")).toHaveValue("DOC-00002");
  await expect(page.locator('[data-picker="doctor"]')).toContainText("Dr. Ali Al-Jubouri");
  await expect(dialog).toBeVisible();
});

test("a long list has a search box", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await navigate(page, "/prescriptions/new?patient=PAT-2026-00001");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const medicine = page.locator("label").filter({ has: page.getByText("Medicine", { exact: true }) }).locator("button").first();
  await expect(medicine).toContainText("Choose a medicine");
  await medicine.click();
  const search = page.getByRole("combobox", { name: "Search…" });
  await expect(search).toBeFocused();
  await search.fill("metro");
  const list = page.getByRole("listbox");
  await expect(list.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(medicine).toContainText("Metronidazole");

  // A short list (the doctors) has none.
  await page.locator('[data-picker="doctor"]').click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Search…" })).toHaveCount(0);
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the calendar has Arabic month and day names and sets the date", async ({ page }) => {
    await openPatientDialog(page, "open-new-appointment");
    await page.locator('[data-picker="appointment_date"]').click();
    const grid = page.getByRole("grid", { name: "أيلول 2026" });
    await expect(grid).toBeVisible();
    await expect(grid.getByRole("columnheader").first()).toHaveText("أحد");
    // Today (26 September 2026) is marked.
    await expect(page.locator('[data-day="2026-09-26"]')).toHaveAttribute("aria-current", "date");
    await page.locator('[data-day="2026-09-28"]').click();
    await expect(grid).toHaveCount(0);
    await expect(page.locator('input[name="appointment_date"]')).toHaveValue("2026-09-28");
    await expect(page.locator('[data-picker="appointment_date"]')).toContainText("28 أيلول 2026");
    // The dialog is still open.
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("medical values that say nothing read لا يوجد", async ({ page }) => {
    await page.goto("/patients/PAT-2026-00001");
    await waitForData(page);
    // Zahraa's current medications and chronic diseases are "None" in the data.
    await expect(page.getByText("لا يوجد", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("None", { exact: true })).toHaveCount(0);
  });
});

test("the time picker sets hours, minutes and AM / PM", async ({ page }) => {
  await openPatientDialog(page, "open-new-appointment");
  await page.locator('[data-picker="appointment_time"]').click();
  await page.getByRole("listbox", { name: "Hour" }).getByRole("option", { name: "2", exact: true }).click();
  await page.getByRole("listbox", { name: "Minute" }).getByRole("option", { name: "30", exact: true }).click();
  await page.getByRole("listbox", { name: "AM or PM" }).getByRole("option", { name: "PM" }).click();
  await expect(page.locator('input[name="appointment_time"]')).toHaveValue("14:30");
  // Tab stays inside the picker (it is over a dialog, at the end of the page).
  for (let i = 0; i < 5; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest("[data-popover]")))).toBe(true);
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("listbox", { name: "Hour" })).toHaveCount(0);
  await expect(page.locator('[data-picker="appointment_time"]')).toContainText("2:30 PM");
});

test("an empty required field shows our message, not the browser's", async ({ page }) => {
  await page.goto("/patients");
  await waitForData(page);
  await page.getByTestId("open-new-patient").click();
  await page.getByRole("button", { name: "Save Patient" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Fill in this field." }).first()).toBeVisible();
  await expect(page.getByLabel("Full Name")).toBeFocused();
  // Typing clears it.
  await page.getByLabel("Full Name").fill("Test Patient");
  await expect(page.getByRole("alert").filter({ hasText: "Fill in this field." })).toHaveCount(1);

  // Typing a letter in a short list jumps to the item that starts with it.
  await page.locator('[data-picker="gender"]').click();
  await page.keyboard.type("f");
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-picker="gender"]')).toContainText("Female");
});

test("on a phone a list opens as a sheet from the bottom", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/patients");
  await waitForData(page);
  await page.locator('[data-picker="balance"]').click();
  const sheet = page.locator("[data-popover-sheet]");
  await expect(sheet).toBeVisible();
  const box = await sheet.locator("[role='listbox']").boundingBox();
  expect(box && box.y + box.height).toBeGreaterThan(700);
  await sheet.getByRole("option").nth(1).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByLabel("Balance")).toHaveValue("owing");
});

test("the calendar keeps the keys after a year is chosen, and Escape closes only the calendar", async ({ page }) => {
  await page.goto("/patients");
  await waitForData(page);
  await page.getByTestId("open-new-patient").click();
  await page.locator('[data-picker="date_of_birth"]').click();
  await page.getByRole("button", { name: "Choose the year" }).click();
  await page.getByRole("button", { name: "Earlier years" }).click();
  await page.getByRole("button", { name: "2010", exact: true }).click();
  // The months are shown, and the focus is still in the calendar.
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest("[data-popover]")))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-popover]")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("the message under a field goes once the page fills it in", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await navigate(page, "/payments/new");
  await page.getByRole("button", { name: "Save Payment" }).click();
  const choose = page.getByRole("alert").filter({ hasText: "Choose one." });
  await expect(choose).toHaveCount(1);
  // Choosing a patient sends no input event from the field itself.
  await pickLink(page, "Patient", "Zahraa", "Zahraa Hussein");
  await expect(choose).toHaveCount(0);
});
