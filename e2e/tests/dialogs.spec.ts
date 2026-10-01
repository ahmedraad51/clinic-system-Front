import { expect, test } from "../fixtures";
import { formDialog, navigate, openSaved, pickLink, waitForData } from "../helpers";

// New and edit forms open in a dialog over the page they are opened from (see RecordDialogs.tsx).

test("the patient page opens its forms with the patient filled in, and stays after saving", async ({ page }) => {
  // هبة كاظم.
  await page.goto("/patients/PAT-2026-00003");
  await waitForData(page);
  await expect(page.getByRole("heading", { name: "هبة كاظم" })).toBeVisible();

  await page.getByTestId("open-new-treatment").click();
  const dialog = formDialog(page, "New Treatment Plan");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("هبة كاظم").first()).toBeVisible();
  await dialog.getByLabel("Treatment Type").selectOption("Extraction");
  await dialog.getByLabel(/Total Cost/).fill("30000");
  await dialog.getByRole("button", { name: "Save Treatment" }).click();
  await expect(dialog).toBeHidden();

  // Still on her page, and the Treatment Plans tab has the new plan.
  await expect(page).toHaveURL(/\/patients\/PAT-2026-00003$/);
  await expect(page.getByRole("status").filter({ hasText: "Treatment plan created." })).toBeVisible();
  await page.getByRole("tab", { name: /Treatment Plans/ }).click();
  await expect(page.getByRole("link", { name: "Extraction" })).toBeVisible();
});

test("Escape closes an untouched dialog; typed changes are kept unless the user says to drop them", async ({ page }) => {
  await page.goto("/treatments");
  await waitForData(page);
  const open = page.getByRole("button", { name: "New Treatment" }).first();

  await open.click();
  const dialog = formDialog(page, "New Treatment Plan");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await open.click();
  await dialog.getByLabel("Diagnosis").fill("Half typed");
  await page.keyboard.press("Escape");
  const ask = page.getByRole("dialog", { name: "Leave without saving?" });
  await expect(ask).toBeVisible();
  await ask.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog.getByLabel("Diagnosis")).toHaveValue("Half typed");

  // The close button asks too; leaving closes the form and nothing was saved.
  await dialog.getByRole("button", { name: "Close" }).click();
  await ask.getByRole("button", { name: "Leave without saving" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/treatments$/);
  // The form and its question closed together, and the page scrolls again.
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

  // A new opening starts empty.
  await open.click();
  await expect(dialog.getByLabel("Diagnosis")).toHaveValue("");
});

test("Escape in the patient picker closes only its list", async ({ page }) => {
  await page.goto("/appointments?view=day");
  await waitForData(page);
  await page.getByRole("button", { name: "Book at 3:00 PM with د. زينب الهاشمي" }).click();
  const dialog = formDialog(page, "New Appointment");
  await dialog.locator("label").filter({ hasText: "Patient" }).first().getByRole("button").first().click();
  await page.locator('input[role="combobox"]').fill("زه");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Time")).toHaveValue("15:00");
  // The search palette does not open over a form.
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toHaveCount(1);
});

test("editing an appointment in a dialog updates the page behind", async ({ page }) => {
  await page.goto("/appointments/APT-2026-00001");
  await waitForData(page);
  const url = page.url();
  await page.getByRole("button", { name: "Edit" }).first().click();
  const dialog = formDialog(page, "Edit Appointment");
  await expect(dialog.getByLabel("Reason for Visit")).not.toHaveValue("");
  await dialog.getByLabel("Reason for Visit").fill("Changed in the dialog");
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(dialog).toBeHidden();
  expect(page.url()).toBe(url);
  await expect(page.getByText("Changed in the dialog").first()).toBeVisible();
});

test("Add Patient slides in from the end side, in English and in Arabic", async ({ page }) => {
  await page.goto("/patients");
  await waitForData(page);
  await page.getByTestId("open-new-patient").click();
  const panel = formDialog(page, "New Patient");
  await expect(panel).toBeVisible();
  const width = page.viewportSize()?.width ?? 0;
  await expect.poll(async () => {
    const box = await panel.boundingBox();
    return box ? Math.round(box.x + box.width) : 0;
  }).toBe(width);
  // It fills the height of the screen.
  const box = await panel.boundingBox();
  expect(box?.height).toBeGreaterThan((page.viewportSize()?.height ?? 0) - 2);
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the side panel opens from the left and saves", async ({ page }) => {
    await page.goto("/patients");
    await waitForData(page);
    await page.getByTestId("open-new-patient").click();
    const panel = formDialog(page, "مريض جديد");
    await expect(panel).toBeVisible();
    await expect.poll(async () => Math.round((await panel.boundingBox())?.x ?? -1)).toBe(0);

    await panel.getByLabel("الاسم الكامل").fill("مريضة تجربة");
    await panel.getByLabel("رقم الهاتف").fill("0790 111 2233");
    await panel.getByRole("button", { name: "حفظ المريض" }).click();
    await expect(panel).toBeHidden();
    await openSaved(page, /مريضة تجربة/);
    await expect(page.getByRole("heading", { name: "مريضة تجربة" })).toBeVisible();
  });
});

test("dialogs follow dark mode", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("appearance", JSON.stringify({ mode: "dark" })));
  await page.goto("/payments");
  await waitForData(page);
  await page.getByRole("button", { name: "Add Payment" }).first().click();
  const dialog = formDialog(page, "New Payment");
  await expect(dialog).toBeVisible();
  const lightness = await dialog.evaluate((el) => {
    const [r, g, b] = getComputedStyle(el).backgroundColor.match(/\d+/g)!.map(Number);
    return (r + g + b) / 3;
  });
  expect(lightness).toBeLessThan(80);
});

test("on a phone a dialog fills the screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/treatments");
  await waitForData(page);
  await page.getByRole("button", { name: "New Treatment" }).first().click();
  const dialog = formDialog(page, "New Treatment Plan");
  await expect(dialog).toBeVisible();
  await expect.poll(async () => {
    const box = await dialog.boundingBox();
    return box ? [Math.round(box.width), Math.round(box.height)] : [];
  }).toEqual([390, 844]);
  // Save and Cancel stay in reach at the bottom.
  const save = dialog.getByRole("button", { name: "Save Treatment" });
  await expect(save).toBeInViewport();
});

test("the old form pages still work on their own", async ({ page }) => {
  await page.goto("/treatments/new?patient=PAT-2026-00007");
  await waitForData(page);
  await expect(page.getByRole("heading", { name: "New Treatment Plan" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Treatment Type").selectOption("Whitening");
  await page.getByLabel(/Total Cost/).fill("250000");
  await page.getByRole("button", { name: "Save Treatment" }).click();
  await expect(page.getByRole("heading", { name: /^Whitening/ })).toBeVisible();

  await navigate(page, "/payments/new");
  await pickLink(page, "Patient", "شهد", "شهد قاسم");
  await expect(page.getByRole("heading", { name: "New Payment" })).toBeVisible();
});
