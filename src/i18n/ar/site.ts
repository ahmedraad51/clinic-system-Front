import type { Messages } from "../en";

export const site: Messages["site"] = {
  title: "DentClinic",
  tagline: "أدِر عيادة الأسنان بالعربية والإنجليزية: المرضى والمواعيد والعلاجات والمدفوعات والتقارير.",
  language: "اللغة",
  findTitle: "اذهب إلى عيادتك",
  findText: "لكل عيادة عنوانها الخاص على الإنترنت. اكتب عنوان عيادتك لتسجيل الدخول.",
  findLabel: "عنوان عيادتك",
  findPlaceholder: "alnoor",
  findButton: "انتقال",
  findInvalid: "استخدم من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا أو شرطة، يبدأ بحرف.",
  findPreview: (address: string) => `ستنتقل إلى ${address}`,
  openClinic: "فتح العيادة",
  singleClinic: "هذه النسخة من DentClinic تخدم عيادة واحدة.",
};
