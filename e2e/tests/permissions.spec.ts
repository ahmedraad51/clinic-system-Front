import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";

test("a receptionist cannot open Reports", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  const menu = page.getByRole("navigation");
  await expect(menu.getByRole("link", { name: "Reports", exact: true })).toBeVisible();

  // Profile > Try Another User > Mariam Saeed (Clinic Receptionist).
  await page.getByLabel("View the app as").selectOption({ label: "Mariam Saeed" });
  await expect(page.getByText("Clinic Receptionist").first()).toBeVisible();
  await waitForData(page);

  await expect(menu.getByRole("link", { name: "Reports", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Users", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Patients", exact: true })).toBeVisible();

  // Even when the address is opened, the page refuses.
  await navigate(page, "/reports");
  await expect(page.getByText("You do not have access to this page")).toBeVisible();
});
