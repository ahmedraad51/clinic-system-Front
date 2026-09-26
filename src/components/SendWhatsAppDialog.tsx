"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Alert, Button, Field, SelectInput, TextArea } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useSettings } from "@/context/SettingsContext";
import { getList } from "@/lib/frappe";
import { formatDate, formatTime } from "@/lib/format";
import { fillTemplate, whatsappLink } from "@/lib/whatsapp";
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
  const { clinicName } = useSettings();
  const [templates, setTemplates] = useState<WhatsAppTemplate[] | null>(null);
  const [chosen, setChosen] = useState("");
  const [text, setText] = useState("");

  // What the placeholders become, as a string so the effect below can depend on it.
  const valuesKey = JSON.stringify({
    patient_name: appointment.patient_name || appointment.patient,
    appointment_date: formatDate(appointment.appointment_date),
    appointment_time: formatTime(appointment.appointment_time),
    doctor_name: appointment.doctor_name || "",
    clinic_name: clinicName,
  });
  const values = JSON.parse(valuesKey) as Record<string, string>;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<WhatsAppTemplate>("WhatsApp Template", ["name", "template_name", "trigger", "message", "is_active"], {
          filters: [["is_active", "=", 1]],
          orderBy: "template_name asc",
          limit: 0,
        });
        if (cancelled) return;
        setTemplates(rows);
        if (rows[0]) {
          setChosen(rows[0].name);
          setText(fillTemplate(rows[0].message, JSON.parse(valuesKey)));
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

  const link = whatsappLink(phone, text.trim());

  return (
    <Modal open title="Send on WhatsApp" onClose={onClose}>
      <div className="space-y-4">
        {templates === null ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <>
            {templates.length > 0 && (
              <Field label="Template">
                <SelectInput
                  value={chosen}
                  onChange={(event) => {
                    setChosen(event.target.value);
                    const template = templates.find((t) => t.name === event.target.value);
                    setText(template ? fillTemplate(template.message, values) : "");
                  }}
                >
                  {templates.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.template_name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            )}
            <Field label="Message" hint={`To ${phone}. You can change the text before sending.`}>
              <TextArea rows={5} value={text} onChange={(event) => setText(event.target.value)} />
            </Field>
            {!link && <Alert tone="yellow">This patient has no phone number WhatsApp can use.</Alert>}
            <div className="flex flex-wrap gap-2 pt-1">
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl bg-green-600 text-white text-sm font-medium shadow-sm hover:bg-green-700"
                >
                  <MessageCircle size={16} />
                  Open WhatsApp
                </a>
              )}
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
