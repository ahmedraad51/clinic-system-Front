import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";
import { baseAmount, convertMoney, rateOn, roundMoney, settleTolerance, sumByCurrency, totalsOrder } from "../../src/lib/currency";

// The dummy clinic takes dinars and dollars: 1 USD was 1,480 IQD from January 2026 and 1,460 from September.
const HIBA = "PAT-2026-00003";
const WHITENING = "TRT-2026-00006"; // Hiba's whitening: IQD 250,000, nothing paid.
const DOLLAR_IMPLANT = "TRT-2026-00016"; // Ruqaya's implant: $700; in August $300 in dollars and IQD 148,000 in dinars.

test("rates count from their date, and amounts convert both ways", () => {
  const rates = [
    { rate_date: "2026-09-01", rate: 1460 },
    { rate_date: "2026-01-01", rate: 1480 },
  ];
  expect(rateOn(rates, "2026-08-31")).toBe(1480);
  expect(rateOn(rates, "2026-09-01")).toBe(1460);
  // Before the first rate: the first rate.
  expect(rateOn(rates, "2025-12-01")).toBe(1480);
  expect(rateOn([], "2026-09-01")).toBeNull();
  expect(convertMoney(100, "USD", "IQD", 1460, "IQD")).toBe(146000);
  expect(convertMoney(146000, "IQD", "USD", 1460, "IQD")).toBe(100);
  expect(convertMoney(1000000, "IQD", "USD", 1460, "IQD")).toBe(684.93);
  expect(convertMoney(10, "USD", "IQD", null, "IQD")).toBeNull();
  expect(convertMoney(10, "IQD", "IQD", null, "IQD")).toBe(10);
  expect(roundMoney(1499.6, "IQD")).toBe(1500);
  const totals = sumByCurrency(
    [{ amount: 300, currency: "USD" }, { amount: 146000, currency: "IQD" }, { amount: 50, currency: "USD" }],
    (row) => row.amount,
    (row) => row.currency,
  );
  expect(totals).toEqual({ USD: 350, IQD: 146000 });
  expect(totalsOrder(totals, "IQD")).toEqual(["IQD", "USD"]);
  // A payment saved before there were two currencies has only its amount.
  expect(baseAmount({ amount: 5000 })).toBe(5000);
  expect(baseAmount({ amount: 100, base_amount: 146000 })).toBe(146000);
  // Frappe returns 0 for an empty Currency field; a payment is never 0.
  expect(baseAmount({ amount: 5000, base_amount: 0 })).toBe(5000);
  // Paying a dinar plan in dollars may go over by less than one cent (IQD 14.6 at 1,460), never by a cent.
  const tolerance = settleTolerance("USD", "IQD", 1460, "IQD");
  expect(tolerance).toBeGreaterThan(14);
  expect(tolerance).toBeLessThan(14.6);
  expect(settleTolerance("IQD", "IQD", 1460, "IQD")).toBe(0);
});

test("a dollar payment on a dinar plan uses the day's rate, and the receipt says so", async ({ page }) => {
  await page.goto(`/patients/${HIBA}`);
  await waitForData(page);
  await navigate(page, `/payments/new?patient=${HIBA}&treatment=${WHITENING}`);
  await expect(page.getByLabel("Treatment Plan")).toHaveValue(WHITENING);
  await page.getByRole("combobox", { name: "Currency", exact: true }).selectOption("USD");
  await page.getByLabel(/Amount/).fill("100");
  const rate = page.getByTestId("payment-rate");
  await expect(rate).toContainText(/Rate on 26 Sep 2026: \$1 = IQD\s1,460/);
  await expect(rate).toContainText(/Counts as IQD\s146,000 on this plan\./);
  // What is left (IQD 250,000), in dollars, rounded up to the cent.
  await expect(page.getByText("Up to $171.24 for this plan.")).toBeVisible();

  await page.getByRole("button", { name: "Save Payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment Receipt" })).toBeVisible();
  await expect(page.getByText("$100", { exact: true }).first()).toBeVisible();
  const receipt = page.getByTestId("receipt-rate");
  await expect(receipt).toContainText(/Exchange rate\s*\$1 = IQD\s1,460/);
  await expect(receipt).toContainText(/On the plan\s*IQD\s146,000/);

  await navigate(page, `/treatments/${WHITENING}`);
  await waitForData(page);
  await expect(page.getByTestId("plan-paid")).toHaveText("IQD 146,000");
  await expect(page.getByTestId("plan-remaining")).toHaveText("IQD 104,000");
});

test("paying the full balance in dollars closes a dinar plan", async ({ page }) => {
  await page.goto(`/payments/new?patient=${HIBA}&treatment=${WHITENING}`);
  await expect(page.getByLabel("Treatment Plan")).toHaveValue(WHITENING);
  await page.getByRole("combobox", { name: "Currency", exact: true }).selectOption("USD");
  await page.getByRole("button", { name: "Pay full balance" }).click();
  await expect(page.getByLabel(/Amount/)).toHaveValue("171.24");
  // $171.24 is IQD 250,010: the plan only takes what it had left.
  await expect(page.getByTestId("payment-rate")).toContainText(/Counts as IQD\s250,000 on this plan\./);
  await page.getByRole("button", { name: "Save Payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment Receipt" })).toBeVisible();
  await expect(page.getByTestId("receipt-rate")).toContainText(/On the plan\s*IQD\s250,000/);
  await navigate(page, `/treatments/${WHITENING}`);
  await waitForData(page);
  await expect(page.getByTestId("plan-remaining")).toHaveText("IQD 0");
});

test("a payment dated earlier uses the rate of its own day", async ({ page }) => {
  await page.goto(`/payments/new?patient=${HIBA}&treatment=${WHITENING}`);
  await expect(page.getByLabel("Treatment Plan")).toHaveValue(WHITENING);
  await page.getByLabel("Date").fill("2026-08-15");
  await page.getByRole("combobox", { name: "Currency", exact: true }).selectOption("USD");
  await page.getByLabel(/Amount/).fill("50");
  await expect(page.getByTestId("payment-rate")).toContainText(/Rate on 15 Aug 2026: \$1 = IQD\s1,480/);
  await expect(page.getByTestId("payment-rate")).toContainText(/Counts as IQD\s74,000/);
});

test("a plan in dollars keeps its money in dollars, whatever the patient pays in", async ({ page }) => {
  await page.goto(`/treatments/${DOLLAR_IMPLANT}`);
  await waitForData(page);
  await expect(page.getByTestId("plan-paid")).toHaveText("$400");
  await expect(page.getByTestId("plan-remaining")).toHaveText("$300");
  await expect(page.getByText("Counts as $100 on this plan.")).toBeVisible();

  // A new payment on it starts in dollars, and cannot be more than what is left, in either currency.
  await page.getByRole("link", { name: "Add Payment" }).first().click();
  await expect(page.getByRole("heading", { name: "New Payment" })).toBeVisible();
  await expect(page.getByLabel("Treatment Plan")).toHaveValue(DOLLAR_IMPLANT);
  const currency = page.getByRole("combobox", { name: "Currency", exact: true });
  await expect(currency).toHaveValue("USD");
  await page.getByLabel(/Amount/).fill("500");
  await page.getByRole("button", { name: "Save Payment" }).click();
  await expect(page.getByText("This plan only has $300 left to pay.")).toBeVisible();
  await currency.selectOption("IQD");
  await page.getByLabel(/Amount/).fill("500000");
  await page.getByRole("button", { name: "Save Payment" }).click();
  await expect(page.getByText(/This plan only has IQD\s438,000 left to pay\./)).toBeVisible();
  await page.getByRole("button", { name: "Pay full balance" }).click();
  await expect(page.getByLabel(/Amount/)).toHaveValue("438000");
  await page.getByRole("button", { name: "Save Payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment Receipt" })).toBeVisible();
  await expect(page.getByTestId("receipt-rate")).toContainText(/On the plan\s*\$300/);

  await page.getByRole("link", { name: /Implant \(TRT-/ }).click();
  await waitForData(page);
  await expect(page.getByTestId("plan-remaining")).toHaveText("$0");
  // Its currency cannot change under its payments.
  await navigate(page, `/treatments/${DOLLAR_IMPLANT}/edit`);
  await expect(page.getByRole("combobox", { name: /^Currency/ })).toBeDisabled();
  await expect(page.getByText("This plan has payments, so its currency stays as it is.")).toBeVisible();
});

test("a new plan can be priced in dollars", async ({ page }) => {
  await page.goto("/treatments/new?patient=PAT-2026-00009");
  await page.getByLabel("Treatment Type").selectOption("Implant");
  const cost = page.getByLabel(/Total Cost/);
  await expect(cost).toHaveValue("1000000");
  await page.getByRole("combobox", { name: "Currency", exact: true }).selectOption("USD");
  // The price list is in dinars: the cost is cleared, and the hint says what it is in dollars today.
  await expect(cost).toHaveValue("");
  await expect(page.getByText(/Usual price for implant: IQD\s1,000,000 \(about \$684\.93 at today's rate\)/)).toBeVisible();
  await expect(page.getByLabel(/^Total Cost \(USD\)/)).toBeVisible();
  await cost.fill("800");
  await page.getByRole("button", { name: "Save Treatment" }).click();
  await expect(page.getByRole("heading", { name: /^Implant/ })).toBeVisible();
  await waitForData(page);
  await expect(page.getByTestId("plan-remaining")).toHaveText("$800");
});

test("totals keep each currency apart, and the drawer counts dinars only", async ({ page }) => {
  await page.goto("/payments/day?date=2026-08-10");
  await waitForData(page);
  await expect(page.getByText("Cash", { exact: true }).first().locator("..")).toContainText("$300");
  await expect(page.getByTestId("other-cash")).toHaveText(
    "Cash in the other currency on this day: $300. It is not part of the count below: count it apart.",
  );
  await expect(page.getByText("Cash payments", { exact: true }).locator("..")).toContainText(/IQD\s0/);

  await navigate(page, "/payments");
  await waitForData(page);
  await expect(page.getByText(/^IQD\s[\d,]+ \+ \$300$/)).toBeVisible();

  await navigate(page, "/reports");
  await waitForData(page);
  await page.getByLabel("Period").selectOption("this_year");
  await expect(page.getByText(/^Received: IQD\s[\d,]+ \+ \$300$/)).toBeVisible();
});

test("the exchange rate is kept in Settings, one per date", async ({ page }) => {
  await page.goto("/settings");
  await waitForData(page);
  await expect(page.getByRole("combobox", { name: "Second currency" })).toHaveValue("USD");
  await expect(page.getByLabel("1 USD in IQD")).toHaveCount(2);
  // Plans and payments are in dollars: the second currency stays.
  const second = page.getByRole("combobox", { name: "Second currency" });
  await second.selectOption("");
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByText("Plans or payments are in USD, so it stays as the second currency.")).toBeVisible();
  await second.selectOption("USD");
  // A rate keeps its decimals.
  await page.getByLabel("1 USD in IQD").last().fill("1462.5");
  await expect(page.getByLabel("1 USD in IQD").last()).toHaveValue("1462.5");
  await page.getByLabel("1 USD in IQD").last().fill("1460");
  await page.getByRole("button", { name: "Add Rate" }).click();
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByText("Each exchange rate needs a date and an amount above zero, one rate per date, and at least one rate for the second currency.")).toBeVisible();
  await page.getByLabel("1 USD in IQD").last().fill("1500");
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  await navigate(page, `/payments/new?patient=${HIBA}&treatment=${WHITENING}`);
  await expect(page.getByLabel("Treatment Plan")).toHaveValue(WHITENING);
  await page.getByRole("combobox", { name: "Currency", exact: true }).selectOption("USD");
  await expect(page.getByTestId("payment-rate")).toContainText(/Rate on 26 Sep 2026: \$1 = IQD\s1,500/);
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("a dollar receipt shows dollars and the rate", async ({ page }) => {
    await page.goto("/payments/PAY-2026-00017");
    await waitForData(page);
    await expect(page.getByText("148,000 د.ع", { exact: true }).first()).toBeVisible();
    const receipt = page.getByTestId("receipt-rate");
    await expect(receipt).toContainText("سعر الصرف");
    await expect(receipt).toContainText("1 $ = 1,480 د.ع");
    await expect(receipt).toContainText("100 $");
  });
});
