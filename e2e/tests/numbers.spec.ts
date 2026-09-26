import { expect, test } from "../fixtures";
import { navigate, pickLink, waitForData } from "../helpers";
import { cleanNumberText, currencyDecimals, formatMoney } from "../../src/lib/format";

test("Iraqi dinars are shown without decimals", () => {
  // Intl puts a non-breaking space after the currency code.
  expect(formatMoney(1250000, "IQD")).toMatch(/^IQD\s1,250,000$/);
  expect(formatMoney(1250000.5, "iqd")).toMatch(/^IQD\s1,250,001$/);
  expect(formatMoney("75000", "IQD")).toMatch(/^IQD\s75,000$/);
  // Other currencies keep up to two decimals.
  expect(formatMoney(1250.5, "USD")).toBe("$1,250.5");
  expect(formatMoney(4500, "USD")).toBe("$4,500");
  expect(currencyDecimals("IQD")).toBe(0);
  expect(currencyDecimals("usd")).toBe(2);
});

test("number boxes keep only the number, whatever keyboard typed it", () => {
  expect(cleanNumberText("١٬٢٥٠٬٠٠٠")).toBe("1250000");
  expect(cleanNumberText("1,250,000")).toBe("1250000");
  expect(cleanNumberText("12٫5")).toBe("12.5");
  expect(cleanNumberText("۴۵۰۰")).toBe("4500");
  expect(cleanNumberText("IQD 25 000")).toBe("25000");
  // Two or more dots are thousands separators; a dot away from digits is not a decimal mark.
  expect(cleanNumberText("1.250.000")).toBe("1250000");
  expect(cleanNumberText("د.ع 1,250,000")).toBe("1250000");
  // Half-typed decimals survive.
  expect(cleanNumberText("12.")).toBe("12.");
  expect(cleanNumberText(".5")).toBe(".5");
  // Whole numbers (dinars, ages): every dot is a separator.
  expect(cleanNumberText("٤٢", false)).toBe("42");
  expect(cleanNumberText("1.500", false)).toBe("1500");
  expect(cleanNumberText("")).toBe("");
});

test("an amount typed with Arabic digits is saved and shown in dinars", async ({ page }) => {
  await page.goto("/settings");
  await waitForData(page);
  await page.getByLabel("Currency").selectOption("IQD");
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  // Nadia Samir still owes 3,000 on her crown.
  await navigate(page, "/patients/PAT-2026-00001");
  await expect(page.getByText(/^IQD\s3,000$/).first()).toBeVisible();

  await navigate(page, "/payments/new");
  await pickLink(page, "Patient", "Nadia", "Nadia Samir");
  await expect(page.getByLabel("Treatment Plan")).toHaveValue("TRT-2026-00002");
  const amount = page.getByLabel(/Amount/);
  await amount.fill("١٬٥٠٠");
  await expect(amount).toHaveValue("1500");
  // Whole dinars: a dot is read as a thousands separator.
  await amount.fill("1.500");
  await expect(amount).toHaveValue("1500");
  await page.getByRole("button", { name: "Save Payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment Receipt" })).toBeVisible();
  await expect(page.getByText(/^IQD\s1,500$/).first()).toBeVisible();
});

test("age and phone boxes turn Arabic digits into 0-9", async ({ page }) => {
  await page.goto("/patients/new");
  const phone = page.getByLabel("Phone Number");
  await phone.fill("٠٧٧٠ ١٢٣ ٤٥٦٧");
  await expect(phone).toHaveValue("0770 123 4567");
  await page.getByRole("button", { name: "Only know the age?" }).click();
  const age = page.getByLabel("Age", { exact: true });
  await age.fill("٤٢");
  await expect(age).toHaveValue("42");
});

test("Arabic digits typed in the middle of a number go where the cursor is", async ({ page }) => {
  await page.goto("/patients/new");
  const phone = page.getByLabel("Phone Number");
  await phone.fill("0770 4567");
  // Put the cursor after "0770 " and type the missing digits on an Arabic keyboard.
  await phone.evaluate((input: HTMLInputElement) => input.setSelectionRange(5, 5));
  await page.keyboard.type("١٢٣ ");
  await expect(phone).toHaveValue("0770 123 4567");
});

test("an age above 120 is refused", async ({ page }) => {
  await page.goto("/patients/new");
  await page.getByLabel("Full Name").fill("Very Old Patient");
  await page.getByLabel("Phone Number").fill("0770 999 8888");
  await page.getByRole("button", { name: "Only know the age?" }).click();
  await page.getByLabel("Age", { exact: true }).fill("420");
  await page.getByRole("button", { name: "Save Patient" }).click();
  await expect(page.getByText("Enter an age between 0 and 120.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "New Patient" })).toBeVisible();
});
