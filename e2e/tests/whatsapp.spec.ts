import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

test("send a WhatsApp message by hand from an appointment", async ({ page }) => {
  await page.goto("/appointments/APT-2026-00001");
  await waitForData(page);
  await page.getByRole("button", { name: "Send Message" }).click();

  const dialog = page.getByRole("dialog", { name: "Send on WhatsApp" });
  await dialog.getByLabel("Template").selectOption({ label: "Reminder - day before" });
  const message = dialog.getByLabel("Message");
  await expect(message).toHaveValue(/Hello زهراء حسين, this is a reminder of your appointment at DentClinic on 8 Sep 2026 at 10:00 AM with د\. زينب الهاشمي/);

  // The text can be changed before WhatsApp opens with it.
  await message.fill("Hello Zahraa, see you on Tuesday at 10.");
  await expect(dialog.getByRole("link", { name: "Open WhatsApp" })).toHaveAttribute(
    "href",
    "https://wa.me/9647702345678?text=Hello%20Zahraa%2C%20see%20you%20on%20Tuesday%20at%2010.",
  );
});

test("send a payment receipt on WhatsApp", async ({ page }) => {
  await page.goto("/payments/PAY-2026-00001");
  await waitForData(page);
  const link = page.getByRole("main").getByRole("link", { name: "WhatsApp" });
  const href = decodeURIComponent((await link.getAttribute("href")) ?? "");
  expect(href).toContain("https://wa.me/9647702345678?text=");
  expect(href).toContain("Hello زهراء حسين, thank you for your payment of IQD\u00a0100,000 on 20 Aug 2026 for crown at DentClinic.");
  expect(href).toContain("Receipt: PAY-2026-00001 (Bank Transfer). Still to pay: IQD\u00a0100,000.");
});
