/** The "Send on WhatsApp" dialog (a message by hand from a template). */
export const sendWhatsapp = {
  title: "Send on WhatsApp",
  template: "Template",
  /** A template written in another language than the screen: "تذكير قبل يوم (Arabic)". */
  otherLanguage: (name: string, language: string) => `${name} (${language})`,
  message: "Message",
  /** "To 0770 123 4567. You can change the text before sending." (the number is put between the two parts) */
  hintBefore: "To ",
  hintAfter: ". You can change the text before sending.",
  noPhone: "This patient has no phone number WhatsApp can use.",
  open: "Open WhatsApp",
};
