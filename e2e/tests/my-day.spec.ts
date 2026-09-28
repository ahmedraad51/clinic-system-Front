import { expect, test } from "../fixtures";
import { navigate, openFromMenu, waitForData } from "../helpers";

test("a dentist sees their own patients first", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  await page.getByLabel("View the app as").selectOption({ label: "Dr. Zainab Al-Hashimi" });
  await expect(page.getByText("Clinic Doctor").first()).toBeVisible();

  // Dashboard: only Dr. Zainab Al-Hashimi's patient today (Mustafa Jabbar), not Dr. Rusul Kareem's (Fatima Salman).
  await openFromMenu(page, "Dashboard");
  const todayCard = page.locator("section").filter({ has: page.getByRole("heading", { name: "My patients today" }) });
  await expect(todayCard).toContainText("Mustafa Jabbar");
  await expect(todayCard).not.toContainText("Fatima Salman");
  await page.getByRole("button", { name: "Everyone" }).click();
  await expect(page.locator("section").filter({ has: page.getByRole("heading", { name: "Today", exact: true }) })).toContainText(
    "Fatima Salman",
  );

  // Today board: My Day.
  await openFromMenu(page, "Today");
  await expect(page.getByRole("heading", { name: "My Day" })).toBeVisible();
  await expect(page.getByText("Mustafa Jabbar")).toBeVisible();
  await expect(page.getByText("Fatima Salman")).toHaveCount(0);

  // Calendar: their own column, and every doctor one click away.
  await navigate(page, "/appointments?view=day");
  await expect(page.getByLabel("Doctor")).toHaveValue("DOC-00001");
  await expect(page.getByRole("button", { name: /with Dr\. Ali Al-Jubouri/ })).toHaveCount(0);
  await page.getByLabel("Doctor").selectOption("");
  await expect(page.getByRole("button", { name: /with Dr\. Ali Al-Jubouri/ }).first()).toBeAttached();
});
