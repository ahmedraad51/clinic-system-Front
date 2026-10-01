"use client";

import { useEffect, useState } from "react";
import { MessageCircle, WifiOff } from "lucide-react";
import { Alert, Button, Field, SelectInput, TextArea } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useConnectivity } from "@/context/ConnectivityContext";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { currentLang, isLang } from "@/i18n";
import { getList } from "@/lib/frappe";
import { fillAppointmentMessage, pickTemplate, whatsappLink, type AppointmentFacts } from "@/lib/whatsapp";
import type { Appointment, WhatsAppTemplate } from "@/lib/types";

/**
 * Send one WhatsApp message by hand: pick a template, check the filled-in text (it can be changed),
 * and WhatsApp opens with the message ready to send. Nothing is sent without the person pressing Send
 * in WhatsApp itself.
 */
export default function SendWhatsAppDialog({
  appointment,
  phone,
  onClose,
}: {
  appointment: Pick<Appointment, "patient_name" | "patient" | "doctor_name" | "appointment_date" | "appointment_time">;
  phone: string;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const { clinicName, countryCode } = useSettings();
  const [templates, setTemplates] = useState<WhatsAppTemplate[] | null>(null);
  const [chosen, setChosen] = useState("");
  const [text, setText] = useState("");

  // What the placeholders are filled from, as a string so the effect below can depend on it. The date and time are
  // written in each template's own language when it is filled.
  const valuesKey = JSON.stringify({
    patient_name: appointment.patient_name || appointment.patient,
    appointment_date: appointment.appointment_date,
    appointment_time: appointment.appointment_time,
    doctor_name: appointment.doctor_name || "",
    clinic_name: clinicName,
  } satisfies AppointmentFacts);
  const values = JSON.parse(valuesKey) as AppointmentFacts;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<WhatsAppTemplate>(
          "WhatsApp Template",
          ["name", "template_name", "trigger", "message", "is_active", "language"],
          { filters: [["is_active", "=", 1]], orderBy: "template_name asc", limit: 0 },
        );
        if (cancelled) return;
        setTemplates(rows);
        // A message sent by hand: a Manual template (in the screen's language first), else any in that language.
        const best = pickTemplate(rows, "Manual", currentLang());
        if (best) {
          setChosen(best.name);
          setText(fillAppointmentMessage(best.message, best.language, currentLang(), JSON.parse(valuesKey) as AppointmentFacts));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setTemplates([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [valuesKey]);

  const { internet } = useConnectivity();
  const link = whatsappLink(phone, text.trim(), countryCode);

  // Templates in the screen's language first, then those for any language, then the others (stable, so by name within each).
  const rank = (template: WhatsAppTemplate) => (template.language === lang ? 0 : template.language ? 2 : 1);
  const ordered = [...(templates ?? [])].sort((a, b) => rank(a) - rank(b));

  return (
    <Modal open title={t.sendWhatsapp.title} onClose={onClose}>
      <div className="space-y-4">
        {templates === null ? (
          <p className="text-sm text-gray-500">{t.common.loading}</p>
        ) : (
          <>
            {templates.length > 0 && (
              <Field label={t.sendWhatsapp.template}>
                <SelectInput
                  value={chosen}
                  onChange={(event) => {
                    setChosen(event.target.value);
                    const template = templates.find((row) => row.name === event.target.value);
                    setText(template ? fillAppointmentMessage(template.message, template.language, lang, values) : "");
                  }}
                >
                  {ordered.map((row) => (
                    <option key={row.name} value={row.name}>
                      {isLang(row.language) && row.language !== lang
                        ? t.sendWhatsapp.otherLanguage(row.template_name, t.enums.language[row.language])
                        : row.template_name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            )}
            <Field
              label={t.sendWhatsapp.message}
              hint={
                <>
                  {t.sendWhatsapp.hintBefore}
                  <span dir="ltr">{phone}</span>
                  {t.sendWhatsapp.hintAfter}
                </>
              }
            >
              <TextArea rows={5} value={text} onChange={(event) => setText(event.target.value)} dir="auto" />
            </Field>
            {!link && <Alert tone="yellow">{t.sendWhatsapp.noPhone}</Alert>}
            {link && !internet && <Alert tone="yellow">{t.connection.whatsappNeedsInternet}</Alert>}
            <div className="flex flex-wrap gap-2 pt-1">
              {link && !internet && (
                <Button icon={WifiOff} disabled>
                  {t.connection.needsInternet}
                </Button>
              )}
              {link && internet && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-md bg-solid-green text-white text-sm font-medium shadow-sm hover:bg-solid-green-dark"
                >
                  <MessageCircle size={16} />
                  {t.sendWhatsapp.open}
                </a>
              )}
              <Button variant="secondary" onClick={onClose}>
                {t.common.cancel}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
