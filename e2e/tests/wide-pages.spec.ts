import { expect, test } from "../fixtures";
import { formDialog, navigate, openFromMenu, waitForData } from "../helpers";

// The two-column record pages, the permissions table and the settings tabs.

test("the permissions table: a checkbox per section and action, with select-all per row and column", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Users");
  await page.getByRole("link", { name: "داليا جواد" }).click();
  await waitForData(page);

  // The profile card on the side: name, role and status.
  await expect(page.getByRole("heading", { name: "داليا جواد" })).toBeVisible();
  await expect(page.getByText("Clinic Receptionist").first()).toBeVisible();

  const table = page.getByRole("table");
  await expect(table.getByRole("columnheader")).toHaveText(["Section", /View/, /Add/, /Edit/, /Delete/]);
  // An action a section does not have is an empty cell: 12 of the 28.
  await expect(table.getByLabel("Not available")).toHaveCount(12);
  await expect(page.getByText("9 of 16 switched on")).toBeVisible();

  // Dalia can see treatments but not add or change them: the row is partly on.
  const treatments = table.getByRole("checkbox", { name: "All permissions for Treatments" });
  await expect(treatments).not.toBeChecked();
  await treatments.check();
  await expect(table.getByRole("checkbox", { name: "Add Treatments" })).toBeChecked();
  await expect(table.getByRole("checkbox", { name: "Edit Treatments" })).toBeChecked();
  await expect(page.getByText("11 of 16 switched on")).toBeVisible();

  // A column: Delete in every section is only Delete Patients.
  await table.getByRole("checkbox", { name: "Delete in every section" }).check();
  await expect(table.getByRole("checkbox", { name: "Delete Patients" })).toBeChecked();
  // View is on in every section but Reports: a click turns the whole column on, a second one off.
  const viewAll = table.getByRole("checkbox", { name: "View in every section" });
  await expect(viewAll).not.toBeChecked();
  await viewAll.click();
  await expect(table.getByRole("checkbox", { name: "View Reports" })).toBeChecked();
  await viewAll.click();
  await expect(table.getByRole("checkbox", { name: "View Patients" })).not.toBeChecked();
  await expect(table.getByRole("checkbox", { name: "View Reports" })).not.toBeChecked();

  // The Edit column never gives Clinic setup (the right to change everyone's permissions) by the way.
  // Patients, Appointments and Treatments are on for Edit, so the column counts as on without it.
  const editAll = table.getByRole("checkbox", { name: "Edit in every section" });
  await expect(editAll).toBeChecked();
  await expect(table.getByRole("checkbox", { name: "Manage Users" })).not.toBeChecked();
  await editAll.click();
  await expect(table.getByRole("checkbox", { name: "Edit Appointments" })).not.toBeChecked();
  await editAll.click();
  await expect(table.getByRole("checkbox", { name: "Edit Appointments" })).toBeChecked();
  await expect(table.getByRole("checkbox", { name: "Manage Users" })).not.toBeChecked();

  // A role preset fills the table again, and Save keeps it.
  await page.getByRole("button", { name: "Receptionist", exact: true }).click();
  await expect(table.getByRole("checkbox", { name: "View Patients" })).toBeChecked();
  await page.getByRole("button", { name: "Save Permissions" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Permissions saved." })).toBeVisible();
});

test("settings are in tabs, and a missing clinic name brings its tab back", async ({ page }) => {
  await page.goto("/settings");
  await waitForData(page);
  await expect(page.getByRole("tab")).toHaveText(["Clinic", "Currencies", "Language", "Working Hours", "Price List", "Features"]);
  await page.getByLabel("Clinic Name").fill("");
  await page.getByRole("tab", { name: "Features" }).click();
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByRole("tab", { name: "Clinic" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Enter the clinic's name.")).toBeVisible();

  // The email is checked too, though its box is on another tab.
  await page.getByLabel("Clinic Name").fill("DentClinic");
  await page.getByLabel("Email").fill("reception@clinic");
  await page.getByRole("tab", { name: "Price List" }).click();
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByRole("tab", { name: "Clinic" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(/Enter a full email address/)).toBeVisible();
});

test("a doctor has a page with the day, the coming days and open plans", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Doctors");
  await page.getByRole("link", { name: "د. زينب الهاشمي" }).click();
  await waitForData(page);
  await expect(page.getByRole("heading", { name: "د. زينب الهاشمي" })).toBeVisible();
  // مصطفى جبار is with her today at 12:30.
  await expect(page.getByText("مصطفى جبار").first()).toBeVisible();

  // New Appointment books with her.
  await page.getByRole("button", { name: "New Appointment" }).click();
  await expect(formDialog(page, "New Appointment").getByLabel("Doctor")).toHaveValue("DOC-00001");
});

test("record pages use the full width, with the profile card beside the details", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/profile");
  await waitForData(page);
  for (const path of ["/patients/PAT-2026-00001", "/users/" + encodeURIComponent(Buffer.from("dalia.jawad@dentclinic.test").toString("base64")), "/settings"]) {
    await navigate(page, path);
    const aside = page.locator("[data-detail-aside]").first();
    const main = page.locator("main").first();
    const [asideBox, mainBox] = [await aside.boundingBox(), await main.boundingBox()];
    // The profile card sits at the start, and the page is not a narrow column in the middle.
    expect(asideBox && mainBox && asideBox.x - mainBox.x).toBeLessThan(60);
    expect(asideBox?.width).toBeLessThan((mainBox?.width ?? 0) / 2);
  }

  // On a phone they stack.
  await page.setViewportSize({ width: 390, height: 844 });
  await navigate(page, "/patients/PAT-2026-00001");
  const aside = await page.locator("[data-detail-aside]").first().boundingBox();
  expect(aside?.width).toBeGreaterThan(330);
});
