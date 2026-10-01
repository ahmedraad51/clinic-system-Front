import { expect, test } from "../fixtures";
import { formDialog, navigate, openFromMenu, waitForData } from "../helpers";
import { computeProfit, previousPeriod, profitSummary } from "../../src/lib/profit";

// The dummy data has twelve expenses from July to September 2026. This month (1-26 Sep): IQD 250,000 came in
// (د. حيدر العبيدي 200,000, د. نور الساعدي 50,000) and IQD 145,000 went out (supplies 60,000,
// electricity 45,000, a lab bill of 40,000 for Dr. Haider), so the profit is IQD 105,000.

test("profit, per doctor and in plain words, on the Reports page", async ({ page }) => {
  await page.goto("/reports");
  await waitForData(page);
  await expect(page.getByTestId("profit-expenses")).toHaveText("IQD 145,000");
  await expect(page.getByTestId("profit-total")).toHaveText("IQD 105,000");

  const summary = page.getByTestId("profit-summary");
  await expect(summary).toContainText(
    "From 1 Sep 2026 to 26 Sep 2026 the clinic took in IQD 250,000 and spent IQD 145,000, so it made a profit of IQD 105,000 (42% of what came in).",
  );
  // 6 to 31 August: IQD 1,042,000 in, IQD 642,000 out (the dollar curing light at its day's rate).
  await expect(summary).toContainText("That is 74% less than in the 26 days before (6 Aug 2026 to 31 Aug 2026), when the profit was IQD 400,000.");
  await expect(summary).toContainText("The biggest cost was Dental supplies: IQD 60,000 (41% of all costs).");
  await expect(summary).toContainText("د. حيدر العبيدي brought in the most: IQD 200,000, or IQD 160,000 after the costs recorded for them.");
  await expect(summary).toContainText("Patients still owe");

  // Per doctor: the lab bill counts against Dr. Haider; the shared costs against the whole clinic.
  await expect(page.getByTestId("doctor-profit-DOC-00004")).toContainText("IQD 200,000");
  await expect(page.getByTestId("doctor-profit-DOC-00004")).toContainText("IQD 160,000");
  await expect(page.getByTestId("doctor-profit-clinic")).toContainText("Whole clinic (shared costs)");
  await expect(page.getByTestId("doctor-profit-clinic")).toContainText("IQD 105,000");

  // Last month: a profit too, and more than in July.
  await page.getByLabel("Period").selectOption("last_month");
  await expect(summary).toContainText(
    "From 1 Aug 2026 to 31 Aug 2026 the clinic took in IQD 1,042,000 and spent IQD 792,000, so it made a profit of IQD 250,000 (24% of what came in).",
  );
  await expect(summary).toContainText("more than in the 31 days before (1 Jul 2026 to 31 Jul 2026)");
});

test("add, change and delete an expense in a dialog", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Expenses");
  await expect(page.getByTestId("expenses-total")).toHaveText("IQD 1,145,000 + $150");

  await page.getByRole("button", { name: "Add Expense" }).click();
  const dialog = formDialog(page, "New Expense");
  await dialog.getByLabel("Category").selectOption("Lab Fees");
  await dialog.getByLabel(/Amount/).fill("30000");
  await dialog.getByLabel("What for").fill("Root canal files");
  await dialog.getByLabel("Paid to").fill("مختبر المنصور للأسنان");
  await dialog.getByLabel("Doctor").selectOption({ label: "د. نور الساعدي" });
  await dialog.getByRole("button", { name: "Save Expense" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Expense added." })).toBeVisible();
  // The list and the total load again.
  const row = page.getByRole("row", { name: /Root canal files/ });
  await expect(row).toContainText("د. نور الساعدي");
  await expect(page.getByTestId("expenses-total")).toHaveText("IQD 1,175,000 + $150");

  // Change it: the amount must be above zero.
  await row.getByRole("button", { name: "Edit Root canal files" }).click();
  const edit = formDialog(page, "Edit Expense");
  await edit.getByLabel(/Amount/).fill("0");
  await edit.getByRole("button", { name: "Save Changes" }).click();
  await expect(edit.getByText("The amount must be more than zero.")).toBeVisible();
  await edit.getByLabel(/Amount/).fill("35000");
  await edit.getByRole("button", { name: "Save Changes" }).click();
  await expect(edit).toBeHidden();
  await expect(row).toContainText("IQD 35,000");

  // It counts against Dr. Noor in Reports.
  await openFromMenu(page, "Reports");
  await expect(page.getByTestId("doctor-profit-DOC-00003")).toContainText("IQD 15,000");

  // Delete it.
  await openFromMenu(page, "Expenses");
  await page.getByRole("row", { name: /Root canal files/ }).getByRole("button", { name: "Delete Root canal files" }).click();
  await page.getByRole("dialog", { name: "Delete this expense?" }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("row", { name: /Root canal files/ })).toHaveCount(0);
  await expect(page.getByTestId("expenses-total")).toHaveText("IQD 1,145,000 + $150");
});

test("expenses in dollars count at the rate of their day, and filters narrow the list", async ({ page }) => {
  await page.goto("/expenses");
  await waitForData(page);
  await page.getByLabel("Category").selectOption("Equipment");
  await expect(page.getByTestId("expenses-total")).toHaveText("$150");
  await expect(page.getByRole("row", { name: /جهاز تصليب ضوئي LED/ })).toContainText("$150");

  await page.getByRole("button", { name: "Add Expense" }).click();
  const dialog = formDialog(page, "New Expense");
  await dialog.getByLabel("Currency").selectOption("USD");
  await expect(dialog.getByTestId("expense-rate")).toContainText("$1 = IQD 1,460");
});

test("only users with the expenses permissions see them", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  await expect(page.getByRole("navigation").getByRole("link", { name: "Expenses", exact: true })).toBeVisible();
  // داليا جواد, the receptionist, has neither.
  await page.getByLabel("View the app as").selectOption({ label: "داليا جواد" });
  await expect(page.getByText("Clinic Receptionist").first()).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Expenses", exact: true })).toHaveCount(0);
  await navigate(page, "/expenses");
  await expect(page.getByText("You do not have access to this page")).toBeVisible();
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the profit summary reads in Arabic", async ({ page }) => {
    await page.goto("/reports");
    await waitForData(page);
    const summary = page.getByTestId("profit-summary");
    await expect(summary).toContainText("دخل العيادة");
    await expect(summary).toContainText("فكان الربح");
    await expect(summary).toContainText("أكبر تكلفة كانت المواد السنية");
  });
});

test("profit is worked out per doctor, and the period before has the same length", () => {
  const profit = computeProfit({
    payments: [
      { amount: 100, treatment_plan: "T1" },
      { amount: 300, base_amount: 444000, treatment_plan: "T2" },
      { amount: 50 },
    ],
    expenses: [
      { amount: 30, category: "Lab Fees", doctor: "D1", doctor_name: "Dr. A" },
      { amount: 20, category: "Rent" },
    ],
    planDoctors: { T1: { doctor: "D1", name: "Dr. A" }, T2: { doctor: "D2", name: "Dr. B" } },
  });
  expect(profit.revenue).toBe(444150);
  expect(profit.expenses).toBe(50);
  expect(profit.profit).toBe(444100);
  expect(profit.byCategory).toEqual([["Lab Fees", 30], ["Rent", 20]]);
  expect(profit.byDoctor.map((row) => [row.doctor, row.revenue, row.expenses, row.profit])).toEqual([
    ["D2", 444000, 0, 444000],
    ["D1", 100, 30, 70],
    ["", 50, 20, 30],
  ]);
  expect(previousPeriod("2026-09-01", "2026-09-26")).toEqual(["2026-08-06", "2026-08-31", 26]);
  expect(previousPeriod("2026-08-01", "2026-08-31")).toEqual(["2026-07-01", "2026-07-31", 31]);

  const nothing = profitSummary({ profit: computeProfit({ payments: [], expenses: [], planDoctors: {} }), when: "So far", money: String });
  expect(nothing).toEqual(["So far nothing came in and nothing was spent."]);
  const noCosts = profitSummary({ profit: computeProfit({ payments: [{ amount: 10 }], expenses: [], planDoctors: {} }), when: "So far", money: String });
  expect(noCosts[1]).toContain("No expenses are recorded");
});
