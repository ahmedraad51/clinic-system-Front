import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

test("send a WhatsApp message by hand from an appointment", async ({ page }) => {
  await page.goto("/appointments/APT-2026-00001");
  await waitForData(page);
  await page.getByRole("button", { name: "Send Message" }).click();

  const dialog = page.getByRole("dialog", { name: "Send on WhatsApp" });
  await dialog.getByLabel("Template").selectOption({ label: "Reminder - day before" });
  const message = dialog.getByLabel("Message");
  await expect(message).toHaveValue(/Hello Nadia Samir, this is a reminder of your appointment at DentClinic on 8 Sep 2026 at 10:00 AM with Dr\. Sarah Mansour/);

  // The text can be changed before WhatsApp opens with it.
  await message.fill("Hello Nadia, see you on Tuesday at 10.");
  await expect(dialog.getByRole("link", { name: "Open WhatsApp" })).toHaveAttribute(
    "href",
    "https://wa.me/201002345678?text=Hello%20Nadia%2C%20see%20you%20on%20Tuesday%20at%2010.",
  );
});
