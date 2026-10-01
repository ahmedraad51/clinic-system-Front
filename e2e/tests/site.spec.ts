import { expect, test } from "../fixtures";
import { PLANS } from "../../src/config/sales";

test("the public website shows the plans with their prices from the settings file", async ({ page }) => {
  await page.goto("/site");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your dental clinic, organised, in Arabic and English");
  await expect(page.getByText("Free for 14 days. Nothing to pay to try it.")).toBeVisible();

  const cloud = page.locator('[data-plan="cloud"]');
  await expect(cloud.getByTestId("price-cloud")).toHaveText(`IQD ${PLANS.cloud.price.toLocaleString("en")}`);
  await expect(cloud).toContainText("a month");
  await expect(cloud).toContainText("Most chosen");
  await expect(cloud).toContainText(`Up to ${PLANS.cloud.limits.doctors} doctors`);
  const server = page.locator('[data-plan="server"]');
  await expect(server).toContainText("a year");
  await expect(server).toContainText(`+ IQD ${PLANS.server.setupFee.toLocaleString("en")} once, to set it up`);

  // Choosing a plan fills it in on the trial form.
  await server.getByRole("button", { name: "Start with This Plan" }).click();
  await expect(page.locator('select[name="plan"]')).toHaveValue("server");

  // WhatsApp: the sales number, with a first message.
  const whatsapp = page.getByRole("link", { name: "Talk to Us on WhatsApp" }).first();
  await expect(whatsapp).toHaveAttribute("href", /wa\.me\/9647700000000\?text=/);
  await expect(page.getByRole("img", { name: "The DentClinic dashboard" })).toHaveAttribute("src", "/site/en/dashboard.webp");
});

test("the free-trial form checks what it needs, then thanks the visitor", async ({ page }) => {
  await page.goto("/site");
  const form = page.locator("#trial");
  await form.getByRole("button", { name: "Send" }).click();
  await expect(form.getByText("Fill in this field.")).toHaveCount(3);

  await form.getByLabel("Clinic name").fill("عيادة النور");
  await form.getByLabel("Your name").fill("Ali Hassan");
  await form.getByLabel("Mobile number (WhatsApp)").fill("0770");
  await form.getByLabel("Web address you would like").fill("Al Noor");
  await form.getByRole("button", { name: "Send" }).click();
  await expect(form.getByText("Write a mobile number, for example 0770 123 4567.")).toBeVisible();
  await expect(form.getByText("Use 3 to 30 English letters, digits or hyphens, starting with a letter.")).toBeVisible();

  await form.getByLabel("Mobile number (WhatsApp)").fill("0770 123 4567");
  await form.getByLabel("Web address you would like").fill("alnoor");
  await form.getByRole("button", { name: "Send" }).click();
  await expect(form.getByRole("status")).toContainText("Thank you!");
  await expect(form.getByRole("status")).toContainText("We received your request");
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the public website in Arabic", async ({ page }) => {
    await page.goto("/site");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("عيادة أسنانك منظّمة، بالعربية والإنجليزية");
    await expect(page.getByTestId("price-cloud")).toContainText("45,000");
    await expect(page.getByTestId("price-cloud")).toContainText("د.ع");
    await expect(page.locator('[data-plan="server-cloud"]')).toContainText("خادم العيادة + نسخة سحابية");
    await expect(page.getByRole("img", { name: "الشاشة الرئيسية في DentClinic" })).toHaveAttribute("src", "/site/ar/dashboard.webp");
    expect(await page.evaluate(() => document.documentElement.dir)).toBe("rtl");
  });
});
