import type { Messages } from "../en";

export const platform: Messages["platform"] = {
  errors: {
    clinic: "لم يُعثر على هذه العيادة.",
    clinicName: "اكتب اسم العيادة.",
    address: "يجب أن يكون العنوان من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا أو شرطة، يبدأ بحرف.",
    addressTaken: (address: string) => `العنوان ${address} مستخدم.`,
    plan: "اختر باقة.",
    email: "اكتب البريد الإلكتروني للمدير.",
    amount: "يجب أن يكون المبلغ أكبر من صفر.",
    method: "اختر طريقة الدفع.",
    periods: "اختر عدد الأشهر أو السنوات التي يغطيها (من 1 إلى 36).",
  },
};
