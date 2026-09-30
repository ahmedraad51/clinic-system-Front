import { expect, test } from "../fixtures";
import { navigate, pickLink, waitForData } from "../helpers";
import { medicalFlags } from "../../src/lib/medical";
import { fillAppointmentMessage } from "../../src/lib/whatsapp";

/** The main flows in Arabic: the app's default language, right to left. */
test.use({ lang: "ar" });

test("the app opens in Arabic, right to left, and switches to English and back", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", "ar");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("IBM Plex Sans Arabic");
  // Headings are El Messiri.
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector("h1") as Element).fontFamily)).toContain("El Messiri");

  // Arabic words, Iraqi month names and dinars.
  await expect(page.getByRole("heading", { name: "صباح الخير، Administrator" })).toBeVisible();
  await expect(page.getByText("السبت، 26 أيلول 2026")).toBeVisible();
  await expect(page.getByText("250,000 د.ع", { exact: true })).toBeVisible();
  // The menu is on screen (at the right) on a large screen.
  const patients = page.getByRole("navigation").getByRole("link", { name: "المرضى", exact: true });
  await expect(patients).toBeInViewport();
  const box = await patients.boundingBox();
  expect(box?.x ?? 0).toBeGreaterThan(1000);

  // The language menu in the top bar.
  await page.getByRole("button", { name: "تغيير اللغة" }).click();
  await page.getByRole("group", { name: "اللغة" }).getByRole("button", { name: "English" }).click();
  await expect(html).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { name: "Good morning, Administrator" })).toBeVisible();
  await expect(page.getByText("Saturday, 26 September 2026")).toBeVisible();

  // Kept after the page is loaded again.
  await page.reload();
  await waitForData(page);
  await expect(html).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Good morning, Administrator" })).toBeVisible();

  await page.getByRole("button", { name: "Switch the language" }).click();
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: "العربية" }).click();
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "صباح الخير، Administrator" })).toBeVisible();
});

test("add a patient in Arabic", async ({ page }) => {
  await page.goto("/patients/new");
  await expect(page.getByRole("heading", { name: "مريض جديد" })).toBeVisible();
  await page.getByLabel("الاسم الكامل").fill("علي حسن");
  await page.getByLabel("رقم الهاتف").fill("0770 555 0000");
  await page.getByRole("button", { name: "حفظ المريض" }).click();
  await expect(page).toHaveURL(/\/patients\/PAT-2026-\d+$/);
  await expect(page.getByRole("heading", { name: "علي حسن" })).toBeVisible();
  await expect(page.getByText("تمت إضافة علي حسن.")).toBeVisible();
});

test("take a payment in Arabic and print its receipt", async ({ page }) => {
  await page.goto("/payments/new");
  await expect(page.getByRole("heading", { name: "دفعة جديدة" })).toBeVisible();
  // Yousif Sattar has one plan with money left: his filling, 25,000 of 50,000.
  await pickLink(page, "المريض", "Yousif", "Yousif Sattar");
  await page.getByRole("button", { name: "دفع كامل المتبقي" }).click();
  await expect(page.getByLabel(/المبلغ/)).toHaveValue("25000");
  await page.getByRole("button", { name: "حفظ الدفعة" }).click();
  await expect(page.getByRole("heading", { name: "وصل دفع" })).toBeVisible();
  await expect(page.getByText("25,000 د.ع", { exact: true }).first()).toBeVisible();
  // The treatment is named in Arabic.
  await expect(page.getByText(/حشوة/).first()).toBeVisible();
});

test("the clinic can show numbers in Arabic digits", async ({ page }) => {
  await page.goto("/settings");
  await waitForData(page);
  await page.getByRole("tab", { name: "اللغة" }).click();
  await page.getByRole("switch", { name: /الأرقام العربية/ }).click();
  await page.getByRole("button", { name: "حفظ الإعدادات" }).click();
  // The page is drawn again with the new digits; the confirmation stays on screen.
  await expect(page.getByText("تم حفظ الإعدادات.")).toBeVisible();
  await navigate(page, "/dashboard");
  await expect(page.getByText("٢٥٠٬٠٠٠ د.ع", { exact: true })).toBeVisible();
  await expect(page.getByText("السبت، ٢٦ أيلول ٢٠٢٦")).toBeVisible();
});

test("tomorrow's reminder is written in Arabic", async ({ page, context }) => {
  await context.route("https://wa.me/**", (route) => route.abort());
  await page.goto("/today");
  await waitForData(page);
  const send = page.getByRole("link", { name: "إرسال تذكير" });
  // The Arabic "day before" template: "مرحبًا Shahad Qasim، نذكّركم بموعدكم …".
  await expect(send).toHaveAttribute("href", new RegExp(`\\?text=${encodeURIComponent("مرحبًا Shahad Qasim، نذكّركم بموعدكم")}`));
});

test("switching the language with unsaved changes asks first", async ({ page }) => {
  await page.goto("/patients/new");
  await page.getByLabel("الاسم الكامل").fill("نصف مكتوب");
  const language = page.getByRole("group", { name: "اللغة" });
  await page.getByRole("button", { name: "تغيير اللغة" }).click();
  await language.getByRole("button", { name: "English" }).click();
  const dialog = page.getByRole("dialog", { name: "المغادرة دون حفظ؟" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "إلغاء" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByLabel("الاسم الكامل")).toHaveValue("نصف مكتوب");

  // The question stopped the click, so the language menu is still open.
  await language.getByRole("button", { name: "English" }).click();
  await dialog.getByRole("button", { name: "المغادرة دون حفظ" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { name: "New Patient" })).toBeVisible();
});

test("treatments can be searched by the Arabic name of their type", async ({ page }) => {
  await page.goto("/treatments");
  await waitForData(page);
  await page.getByRole("searchbox").fill("حشوة");
  await waitForData(page);
  const rows = page.locator("tbody tr");
  await expect(rows.first()).toContainText("حشوة");
  await expect(rows.filter({ hasText: "علاج عصب" })).toHaveCount(0);
});

test("a WhatsApp message gets the date and time in its own language", () => {
  const facts = { patient_name: "Zahraa", appointment_date: "2026-09-27", appointment_time: "10:00", doctor_name: "Dr. Ali", clinic_name: "DentClinic" };
  expect(fillAppointmentMessage("On {{ appointment_date }} at {{ appointment_time }}", "en", "ar", facts)).toBe("On 27 Sep 2026 at 10:00 AM");
  expect(fillAppointmentMessage("يوم {{ appointment_date }} الساعة {{ appointment_time }}", "ar", "en", facts)).toBe("يوم 27 أيلول 2026 الساعة 10:00 ص");
  // No language on the template: the screen's.
  expect(fillAppointmentMessage("{{ appointment_date }}", "", "ar", facts)).toBe("27 أيلول 2026");
});

test("medical alerts read Arabic notes, and a no at the end of one field does not hide the next", () => {
  const kinds = (fields: Parameters<typeof medicalFlags>[0]) => medicalFlags(fields).map((flag) => flag.kind);
  expect(kinds({ allergies: "لا يوجد", current_medications: "وارفارين 3 ملغ" })).toContain("blood_thinner");
  expect(kinds({ allergies: "لا يوجد", chronic_diseases: "لا يوجد سكري" })).not.toContain("diabetes");
  expect(kinds({ medical_history: "عمليات سابقة؟ لا", notes: "حامل في الشهر الثالث" })).toContain("pregnancy");
});
