import type { Messages } from "../en";
import { num, plural } from "../runtime";

export const backup: Messages["backup"] = {
  nav: "الخادم والنسخ الاحتياطي",
  title: "الخادم والنسخ الاحتياطي",
  subtitle: "أين تُحفظ بيانات عيادتك، ونسختها على الإنترنت، ونسخها الاحتياطية.",
  serverTitle: "الخادم",
  kinds: { cloud: "سحابة DentClinic", "clinic-server": "خادم العيادة", "cloud-copy": "النسخة الإلكترونية من خادم العيادة" },
  reach: { ok: "متصل", unreachable: "تعذّر الوصول إلى الخادم", checking: "جارٍ الفحص…" },
  address: "العنوان",
  serverTime: "وقت الخادم",
  version: "الإصدار",
  internet: "الإنترنت",
  internetYes: "متصل",
  internetNo: "لا يوجد إنترنت",
  checkNow: "افحص الآن",
  unreachableText: "تأكد أن خادم العيادة يعمل وأن هذا الحاسوب متصل بشبكة العيادة.",
  offlineText: "هذا الحاسوب غير متصل بأي شبكة. تحقّق من الكابل أو الواي فاي.",
  copyTitle: "النسخة السحابية",
  copyText: "يرسل خادم العيادة نسخة من كل شيء إلى الإنترنت كل 15 دقيقة ما دام الإنترنت متوفرًا، ليطّلع عليها المالك من البيت.",
  copyIsThis: "هذه هي النسخة الإلكترونية: تُحدَّث من خادم العيادة كل 15 دقيقة ما دام الإنترنت متوفرًا في العيادة.",
  copyStatus: { ok: "محدَّثة", syncing: "تُحدَّث الآن", failed: "لم تُحدَّث", never: "لم تُنشأ بعد" },
  lastUpdate: "آخر تحديث",
  copyAddress: "العنوان على الإنترنت",
  copyNever: "لم تُنشأ النسخة بعد.",
  ago: (minutes: number) =>
    minutes < 1
      ? "الآن"
      : minutes < 60
        ? plural(minutes, { one: "قبل دقيقة", two: "قبل دقيقتين", few: "قبل # دقائق", many: "قبل # دقيقة", other: "قبل # دقيقة" })
        : minutes < 48 * 60
          ? plural(Math.floor(minutes / 60), { one: "قبل ساعة", two: "قبل ساعتين", few: "قبل # ساعات", many: "قبل # ساعة", other: "قبل # ساعة" })
          : plural(Math.floor(minutes / 1440), { one: "قبل يوم", two: "قبل يومين", few: "قبل # أيام", many: "قبل # يومًا", other: "قبل # يوم" }),
  backupsTitle: "النسخ الاحتياطية",
  schedule: (time: string, days: number) => `تُعمل نسخة احتياطية كل ليلة الساعة ${time}. تُحفظ نسخ آخر ${num(days)} يومًا.`,
  scheduleCloud: (time: string, days: number) =>
    `يعمل DentClinic نسخة احتياطية لعيادتك كل ليلة الساعة ${time} ويحفظ نسخ آخر ${num(days)} يومًا. ويمكنك الاحتفاظ بنسختك أيضًا.`,
  disk: (free: string, total: string) => `المساحة الفارغة على قرص النسخ: ${free} من ${total}.`,
  gb: (value: number) => `${num(Math.round(value * 10) / 10)} غيغابايت`,
  mb: (value: number) => `${num(Math.round(value * 10) / 10)} ميغابايت`,
  backupNow: "انسخ الآن",
  backupStarted: "بدأ النسخ الاحتياطي. يستغرق دقيقة أو دقيقتين.",
  backupDone: "تمّت النسخة الاحتياطية.",
  backupFailed: "تعذّر بدء النسخ الاحتياطي.",
  alreadyRunning: "هناك نسخة احتياطية قيد الإنشاء الآن.",
  saveToUsb: "احفظ نسخة على USB",
  saveThis: "احفظ على USB",
  saveFor: (date: string) => `احفظ نسخة ${date} على USB`,
  usbHint: "صِل ذاكرة USB، واضغط «احفظ نسخة على USB»، واختر الذاكرة في النافذة التي تظهر. احفظ الذاكرة في مكان آمن بعيدًا عن حواسيب العيادة.",
  saved: "حُفظت النسخة الاحتياطية. احفظ ذاكرة USB في مكان آمن بعيدًا عن حواسيب العيادة.",
  downloaded: "النسخة الاحتياطية في مجلد التنزيلات على هذا الحاسوب. انسخها إلى ذاكرة USB.",
  downloadFailed: "تعذّر حفظ النسخة الاحتياطية. حاول مرة أخرى.",
  notFound: "هذه النسخة لم تعد موجودة.",
  noBackups: "لا توجد نسخ احتياطية بعد.",
  loadFailed: "تعذّر تحميل النسخ الاحتياطية.",
  columns: { when: "الوقت", kind: "النوع", size: "الحجم", status: "الحالة", cloud: "على الإنترنت أيضًا" },
  kindsOf: { automatic: "كل ليلة", manual: "يدويًا" },
  by: (name: string) => `بواسطة ${name}`,
  statuses: { running: "قيد الإنشاء", done: "تمّت", failed: "فشلت" },
  inCloud: "نعم",
  notInCloud: "ليس بعد",
  mockDiskFull: "امتلأ قرص النسخ. حُذفت النسخ القديمة، ونجحت نسخة الليلة التالية.",
};
