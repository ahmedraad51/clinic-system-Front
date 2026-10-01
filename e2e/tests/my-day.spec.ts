import { expect, test } from "../fixtures";
import { navigate, openFromMenu, waitForData } from "../helpers";

test("a dentist sees their own patients first", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  await page.getByLabel("View the app as").selectOption({ label: "د. زينب الهاشمي" });
  await expect(page.getByText("Clinic Doctor").first()).toBeVisible();

  // Dashboard: only د. زينب الهاشمي's patient today (مصطفى جبار), not د. رسل كريم's (فاطمة سلمان).
  await openFromMenu(page, "Dashboard");
  const todayCard = page.locator("section").filter({ has: page.getByRole("heading", { name: "My patients today" }) });
  await expect(todayCard).toContainText("مصطفى جبار");
  await expect(todayCard).not.toContainText("فاطمة سلمان");
  await page.getByRole("button", { name: "Everyone" }).click();
  await expect(page.locator("section").filter({ has: page.getByRole("heading", { name: "Today", exact: true }) })).toContainText(
    "فاطمة سلمان",
  );

  // Today board: My Day.
  await openFromMenu(page, "Today");
  await expect(page.getByRole("heading", { name: "My Day" })).toBeVisible();
  await expect(page.getByText("مصطفى جبار")).toBeVisible();
  await expect(page.getByText("فاطمة سلمان")).toHaveCount(0);

  // Calendar: their own column, and every doctor one click away.
  await navigate(page, "/appointments?view=day");
  await expect(page.getByLabel("Doctor")).toHaveValue("DOC-00001");
  await expect(page.getByRole("button", { name: /with د\. علي الجبوري/ })).toHaveCount(0);
  await page.getByLabel("Doctor").selectOption("");
  await expect(page.getByRole("button", { name: /with د\. علي الجبوري/ }).first()).toBeAttached();
});
