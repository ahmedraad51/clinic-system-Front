import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";
import { cleanCountryCode, dialableNumber, phoneSearchPattern, samePhone, toLatinDigits } from "../../src/lib/phone";
import { whatsappLink } from "../../src/lib/whatsapp";

test("phone numbers become full international numbers for WhatsApp", () => {
  // A local Iraqi number: the leading 0 becomes 964.
  expect(dialableNumber("0770 123 4567")).toBe("9647701234567");
  expect(dialableNumber("07701234567")).toBe("9647701234567");
  // Already international, with + or 00.
  expect(dialableNumber("+964 770 123 4567")).toBe("9647701234567");
  expect(dialableNumber("00964 770 123 4567")).toBe("9647701234567");
  // Without the 0 or the country code.
  expect(dialableNumber("770 123 4567")).toBe("9647701234567");
  expect(dialableNumber("9647701234567")).toBe("9647701234567");
  // Arabic-keyboard digits, and invisible direction marks from a copied number.
  expect(dialableNumber("٠٧٧٠١٢٣٤٥٦٧")).toBe("9647701234567");
  expect(dialableNumber("\u200e+964 770 123 4567\u200f")).toBe("9647701234567");
  // The local 0 written after the country code is dropped.
  expect(dialableNumber("+964 0770 123 4567")).toBe("9647701234567");
  expect(dialableNumber("00964 0770 123 4567")).toBe("9647701234567");
  // An international number written without + (11 digits or more) is left alone.
  expect(dialableNumber("201002345678")).toBe("201002345678");
  // Another country keeps its own code, and a clinic elsewhere can use its own.
  expect(dialableNumber("+20 100 234 5678")).toBe("201002345678");
  expect(dialableNumber("0100 234 5678", "20")).toBe("201002345678");
  expect(dialableNumber("0100 234 5678", "+20")).toBe("201002345678");
  expect(dialableNumber("0770 123 4567", "00964")).toBe("9647701234567");
  expect(cleanCountryCode("00964")).toBe("964");
  expect(cleanCountryCode("+20")).toBe("20");
  expect(cleanCountryCode("")).toBe("964");
  expect(cleanCountryCode("", "")).toBe("");
  // Too short to be a phone number.
  expect(dialableNumber("12345")).toBe("");
  expect(dialableNumber("")).toBe("");
  expect(whatsappLink("0770 123 4567", "Hello")).toBe("https://wa.me/9647701234567?text=Hello");
  expect(whatsappLink("abc")).toBe("");
});

test("the same number typed in different ways is recognised", () => {
  expect(samePhone("0770 123 4567", "+964 770 123 4567")).toBe(true);
  expect(samePhone("00964 7701234567", "07701234567")).toBe(true);
  expect(samePhone("٠٧٧٠١٢٣٤٥٦٧", "0770-123-4567")).toBe(true);
  expect(samePhone("+20 100 234 5678", "01002345678")).toBe(true);
  expect(samePhone("0770 123 4567", "0780 123 4567")).toBe(false);
  expect(samePhone("", "")).toBe(false);
  expect(samePhone("123", "123")).toBe(false);
  expect(toLatinDigits("PAT-٢٠٢٦ ۱۲")).toBe("PAT-2026 12");
});

test("a phone search matches the stored number however it was typed", () => {
  expect(phoneSearchPattern("+964 770 123 4567")).toBe("%7%0%1%2%3%4%5%6%7%");
  expect(phoneSearchPattern("07701234567")).toBe("%7%0%1%2%3%4%5%6%7%");
  expect(phoneSearchPattern("\u200e٠٧٧٠١٢٣٤٥٦٧")).toBe("%7%0%1%2%3%4%5%6%7%");
  // Not a phone number: letters, or too few digits.
  expect(phoneSearchPattern("Muhannad")).toBeNull();
  expect(phoneSearchPattern("PAT-2026-00001")).toBeNull();
  expect(phoneSearchPattern("0770 12")).toBeNull();
});

test("WhatsApp buttons use the international number for a locally typed phone", async ({ page }) => {
  // مهند طه's number is stored as "0770 123 4567".
  await page.goto("/patients/PAT-2025-00002");
  await waitForData(page);
  await expect(page.getByRole("heading", { name: "مهند طه" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/9647701234567");

  // The recall list's reminder too.
  await navigate(page, "/recall");
  await expect(page.getByRole("row", { name: /مهند طه/ }).getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/9647701234567\?text=Hello%20%D9%85%D9%87%D9%86%D8%AF%20%D8%B7%D9%87/,
  );
});

test("the clinic's country code is used for local numbers", async ({ page }) => {
  await page.goto("/settings");
  await waitForData(page);
  const code = page.getByLabel("Phone Country Code");
  await expect(code).toHaveValue("964");
  await code.fill("+20");
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
  // Saved as plain digits.
  await expect(code).toHaveValue("20");

  await navigate(page, "/patients/PAT-2025-00002");
  await expect(page.getByRole("main").getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/207701234567");
});

test("patients are found by phone however the number is typed", async ({ page }) => {
  await page.goto("/patients");
  await waitForData(page);
  const search = page.getByRole("searchbox");

  // Stored as "0770 123 4567".
  await search.fill("+964 770 123 4567");
  await expect(page.getByRole("link", { name: "مهند طه" })).toBeVisible();
  await expect(page.getByText("1 record", { exact: true })).toBeVisible();

  // Stored as "07801112233", searched with spaces and 00964.
  await search.fill("00964 780 111 2233");
  await expect(page.getByRole("link", { name: "يوسف ستار" })).toBeVisible();
  await expect(page.getByRole("link", { name: "مهند طه" })).toHaveCount(0);
  // Arabic-keyboard digits find مهند طه again.
  await search.fill("٠٧٧٠١٢٣٤٥٦٧");
  await expect(page.getByRole("link", { name: "مهند طه" })).toBeVisible();
  await expect(page.getByRole("link", { name: "يوسف ستار" })).toHaveCount(0);

  // The search box in the top bar (Ctrl+K) too.
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search" });
  await dialog.getByRole("combobox").fill("+9647701234567");
  await expect(dialog.getByRole("option", { name: /مهند طه/ })).toBeVisible();
});

test("a new patient with a known number in another format is flagged", async ({ page }) => {
  await page.goto("/patients/new");
  await page.getByLabel("Full Name").fill("M. Taha");
  await page.getByLabel("Phone Number").fill("+964 770 123 4567");
  const warning = page.getByText("Already registered?").locator("..");
  await expect(warning).toContainText("مهند طه");
  await expect(warning).toContainText("same phone number");
});

test("a phone typed with Arabic digits is saved with 0-9", async ({ page }) => {
  await page.goto("/patients/new");
  await page.getByLabel("Full Name").fill("Arabic Digits Patient");
  await page.getByLabel("Phone Number").fill("٠٧٥٠١٢٣٤٥٦٧");
  await page.getByRole("button", { name: "Save Patient" }).click();
  await expect(page.getByRole("heading", { name: "Arabic Digits Patient" })).toBeVisible();
  await waitForData(page);
  await expect(page.getByRole("link", { name: "07501234567" })).toHaveAttribute("href", "tel:07501234567");
  await expect(page.getByRole("main").getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/9647501234567");
});
