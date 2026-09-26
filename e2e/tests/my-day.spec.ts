import { expect, test } from "@playwright/test";
import { navigate, openFromMenu, waitForData } from "../helpers";

test("a dentist sees their own patients first", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  await page.getByLabel("View the app as").selectOption({ label: "Dr. Sarah Mansour" });
  await expect(page.getByText("Clinic Doctor").first()).toBeVisible();

  // Dashboard: only Dr. Sarah Mansour's patient today (Karim Fouad), not Dr. Hana Aziz's (Salma Ibrahim).
  await openFromMenu(page, "Dashboard");
  const todayCard = page.locator("section").filter({ has: page.getByRole("heading", { name: "My patients today" }) });
  await expect(todayCard).toContainText("Karim Fouad");
  await expect(todayCard).not.toContainText("Salma Ibrahim");
  await page.getByRole("button", { name: "Everyone" }).click();
  await expect(page.locator("section").filter({ has: page.getByRole("heading", { name: "Today", exact: true }) })).toContainText(
    "Salma Ibrahim",
  );

  // Today board: My Day.
  await openFromMenu(page, "Today");
  await expect(page.getByRole("heading", { name: "My Day" })).toBeVisible();
  await expect(page.getByText("Karim Fouad")).toBeVisible();
  await expect(page.getByText("Salma Ibrahim")).toHaveCount(0);

  // Calendar: their own column, and every doctor one click away.
  await navigate(page, "/appointments?view=day");
  await expect(page.getByLabel("Doctor")).toHaveValue("DOC-00001");
  await expect(page.getByRole("button", { name: /with Dr\. Omar Khalil/ })).toHaveCount(0);
  await page.getByLabel("Doctor").selectOption("");
  await expect(page.getByRole("button", { name: /with Dr\. Omar Khalil/ }).first()).toBeAttached();
});
