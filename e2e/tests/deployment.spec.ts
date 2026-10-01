import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

test("with the dummy data, the profile page previews another way of installing", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  const mode = page.getByLabel("Installed as");
  // Built as the cloud (the default).
  await expect(mode).toHaveValue("cloud");
  await expect(page.locator('[data-picker="deployment_mode"]')).toContainText("Cloud (built in)");

  // Choosing reloads the page.
  await Promise.all([page.waitForEvent("load"), mode.selectOption("clinic-server")]);
  await waitForData(page);
  await expect(page.getByLabel("Installed as")).toHaveValue("clinic-server");
  expect(await page.evaluate(() => localStorage.getItem("demo_deployment_mode"))).toBe("clinic-server");

  // Back to the built one: nothing is kept.
  await Promise.all([page.waitForEvent("load"), page.getByLabel("Installed as").selectOption("cloud")]);
  await waitForData(page);
  expect(await page.evaluate(() => localStorage.getItem("demo_deployment_mode"))).toBeNull();
});
