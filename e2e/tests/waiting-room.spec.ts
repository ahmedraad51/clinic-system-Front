import { expect, test } from "../fixtures";
import { openFromMenu, waitForData } from "../helpers";
import { minutesSince, shortName, visitStep } from "../../src/lib/waitingRoom";

test("the front desk marks a patient Arrived, then In Chair, and the waiting room screen follows", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Today");
  const zainab = page.locator("section").filter({ has: page.getByRole("heading", { name: "د. زينب الهاشمي" }) });
  await expect(zainab).toContainText("مصطفى جبار");

  await zainab.getByRole("button", { name: "Arrived" }).click();
  await expect(page.getByRole("status").filter({ hasText: "مصطفى جبار: arrived." })).toBeVisible();
  await expect(zainab.getByText("Waiting, just arrived")).toBeVisible();
  // Here already: no Confirm, and not counted as still to come.
  await expect(zainab.getByRole("button", { name: "Confirm" })).toHaveCount(0);

  await zainab.getByRole("button", { name: "In Chair" }).click();
  await expect(zainab.getByText("In the chair since 8:30 AM")).toBeVisible();
  // A tap by mistake goes back one step.
  await zainab.getByRole("button", { name: "Undo step" }).click();
  await expect(zainab.getByText("Waiting, just arrived")).toBeVisible();

  // The screen for the waiting room: no menu, first names and an initial only.
  await page.getByRole("link", { name: "Waiting Room Screen" }).click();
  await expect(page).toHaveURL(/\/waiting-room$/);
  await waitForData(page);
  await expect(page.getByRole("heading", { name: "Waiting Room" })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  const waiting = page.getByTestId("room-waiting");
  await expect(waiting).toContainText("مصطفى ج.");
  await expect(waiting).toContainText("with د. زينب الهاشمي");
  await expect(page.getByText("مصطفى جبار")).toHaveCount(0);
  await expect(page.getByTestId("room-in-chair")).toContainText("Nobody yet");
  // فاطمة سلمان's 10:00 visit is next.
  await expect(page.getByTestId("room-next")).toContainText("فاطمة س.");
  await expect(page.getByTestId("room-next")).toContainText("10:00 AM");

  // Back to the board, and into the chair: the screen moves the patient over.
  await page.getByRole("link", { name: "Back to Today" }).click();
  await waitForData(page);
  await zainab.getByRole("button", { name: "In Chair" }).click();
  await expect(zainab.getByText("In the chair since 8:30 AM")).toBeVisible();
  await page.getByRole("link", { name: "Waiting Room Screen" }).click();
  await waitForData(page);
  await expect(page.getByTestId("room-in-chair")).toContainText("مصطفى ج.");
  await expect(page.getByTestId("room-waiting")).toContainText("Nobody is waiting");
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the waiting room screen in Arabic", async ({ page }) => {
    await page.goto("/waiting-room");
    await waitForData(page);
    await expect(page.getByRole("heading", { name: "قاعة الانتظار" })).toBeVisible();
    await expect(page.getByTestId("room-waiting")).toContainText("لا أحد ينتظر");
    await expect(page.getByTestId("room-next")).toContainText("فاطمة س.");
  });
});

test("short names, minutes waiting and the step of a visit", () => {
  expect(shortName("Zahraa Hussein")).toBe("Zahraa H.");
  expect(shortName("زهراء حسين")).toBe("زهراء ح.");
  expect(shortName("Abbas Mahdi Al-Tamimi")).toBe("Abbas A.");
  expect(shortName("زهراء حسين")).toBe("زهراء ح.");
  expect(shortName("Hiba")).toBe("Hiba");
  expect(shortName("")).toBe("");

  const now = new Date(2026, 8, 26, 10, 17, 30);
  expect(minutesSince("2026-09-26 10:05:00", now)).toBe(12);
  expect(minutesSince("2026-09-26 10:20:00", now)).toBe(0);
  expect(minutesSince(null, now)).toBe(0);

  expect(visitStep({ status: "Confirmed", arrived_at: "2026-09-26 10:05:00", in_chair_at: null })).toBe("waiting");
  expect(visitStep({ status: "Scheduled", arrived_at: "2026-09-26 10:05:00", in_chair_at: "2026-09-26 10:15:00" })).toBe("in_chair");
  expect(visitStep({ status: "Completed", arrived_at: "2026-09-26 10:05:00", in_chair_at: "2026-09-26 10:15:00" })).toBe(null);
  expect(visitStep({ status: "Scheduled", arrived_at: null, in_chair_at: null })).toBe(null);
});
