import type { Messages } from "../en";
import { plural } from "../runtime";

/** Each tooth's name, whether it is feminine (for the adjectives after it) and what follows the side. */
type ToothWord = [name: string, feminine: boolean, after?: string];

const ADULT_NAMES: ToothWord[] = [
  ["", false],
  ["القاطعة المركزية", true],
  ["القاطعة الجانبية", true],
  ["الناب", false],
  ["الضاحك الأول", false],
  ["الضاحك الثاني", false],
  ["الرحى الأولى", true],
  ["الرحى الثانية", true],
  ["الرحى الثالثة", true, " (ضرس العقل)"],
];
const CHILD_NAMES: ToothWord[] = [
  ["", false],
  ["القاطعة المركزية", true],
  ["القاطعة الجانبية", true],
  ["الناب", false],
  ["الرحى الأولى", true],
  ["الرحى الثانية", true],
];

export const chart: Messages["chart"] = {
  title: "مخطط الأسنان",
  findingsCount: (n: number) =>
    plural(n, {
      zero: "لا توجد حالات مسجّلة",
      one: "سن واحدة فيها حالات",
      two: "سنّان فيهما حالات",
      few: "# أسنان فيها حالات",
      many: "# سنًّا فيها حالات",
      other: "# سن فيها حالات",
    }),
  clickToMark: "اضغط على سن لتسجيل حالتها",
  clickToSee: "اضغط على سن لعرضها",
  teeth: "الأسنان",
  adult: "دائمة",
  child: "لبنية",
  undo: "تراجع",
  saveChart: "حفظ المخطط",
  patientsRight: "يمين المريض",
  patientsLeft: "يسار المريض",
  upperJaw: "الفك العلوي",
  lowerJaw: "الفك السفلي",
  openPlan: "عليها خطة علاج مفتوحة",
  toothButton: (tooth: number, name: string, description: string) => `السن ${tooth}، ${name}${description ? `: ${description}` : ""}`,
  findings: "الحالات المسجّلة",
  nothingMarked: "لم يُسجَّل شيء. كل الأسنان مسجّلة كسليمة.",
  noteOnly: "ملاحظة فقط",

  tooth: (tooth: number) => `السن ${tooth}`,
  closePanel: "إغلاق لوحة السن",
  legacyNotice: (mark: string) => `المخطط القديم سجّل هذه السن كـ«${mark}».`,
  legacyEditHint: "سجّل حالتها أدناه، أو اضغط «سليمة» لمسح العلامة القديمة.",
  surfacesOf: (tooth: number) => `أسطح السن ${tooth}`,
  surfaceButton: (surface: string, state: string) => `السطح ${surface}: ${state}`,
  healthySurface: "سليم",
  markSurfacesAs: "تسجيل الأسطح كـ",
  clear: "مسح",
  toolHint: "اختر تسوّس أو حشوة أو مسح، ثم اضغط على الأسطح.",
  surfaceKey: "M إنسي · O إطباقي/قاطع · D وحشي · B دهليزي (شفوي) · L لساني (حنكي)",
  wholeTooth: "السن كاملة",
  healthy: "سليمة",
  note: "ملاحظة",
  notePlaceholder: "مثلًا: حساسية للبارد، كسر في الحدبة الدهليزية",
  plansForTooth: "خطط العلاج لهذه السن",
  noneYet: "لا يوجد بعد.",
  newTreatmentForTooth: "علاج جديد لهذه السن",

  conditions: {
    crown: "تاج",
    root_canal: "علاج عصب",
    implant: "زرعة",
    bridge: "جسر",
    missing: "مفقودة",
    extract: "للقلع",
  },
  findingNames: {
    caries: "تسوّس",
    filling: "حشوة",
  },
  surfaces: {
    M: "الإنسي",
    O: "الإطباقي",
    D: "الوحشي",
    B: "الدهليزي",
    L: "اللساني",
  },
  legacy: {
    treated: "فيها علاج (المخطط القديم)",
    pending: "تحتاج علاجًا (المخطط القديم)",
  },
  inList: (label: string) => label,
  listSeparator: "، ",
  toothName: (position: number, upper: boolean, right: boolean, child: boolean) => {
    const [name, feminine, after = ""] = (child ? CHILD_NAMES : ADULT_NAMES)[position] ?? ["", false];
    const jaw = upper ? (feminine ? "العلوية" : "العلوي") : feminine ? "السفلية" : "السفلي";
    const side = right ? (feminine ? "اليمنى" : "الأيمن") : feminine ? "اليسرى" : "الأيسر";
    const milk = child ? (feminine ? " (لبنية)" : " (لبني)") : "";
    return `${name} ${jaw} ${side}${after}${milk}`;
  },

  letterheadKind: "مخطط الأسنان",
  patientWhat: "المريض",
  backToPatients: "العودة إلى المرضى",
};
