"use client";

import { useState, type FormEvent } from "react";
import { Button, DateInput, Field, SelectInput, TextArea, TextInput } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
import { errorMessage, updateDoc } from "@/lib/frappe";
import { parseTeeth } from "@/lib/xrays";
import { IMAGE_TYPES, type DentalImage, type ImageType } from "@/lib/types";

/** A select of the image types, the saved value in English and the label in the screen's language. */
export function ImageTypeSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: ImageType;
  onChange: (value: ImageType) => void;
  ariaLabel?: string;
}) {
  const { t } = useI18n();
  return (
    <SelectInput value={value} onChange={(event) => onChange(event.target.value as ImageType)} aria-label={ariaLabel}>
      {IMAGE_TYPES.map((type) => (
        <option key={type} value={type}>
          {label(t.enums.imageType, type)}
        </option>
      ))}
    </SelectInput>
  );
}

/** Edits an image's type, date taken, teeth and description (not the file, and not the drawing). */
export default function ImageDetailsDialog({
  image,
  onClose,
  onSaved,
}: {
  image: DentalImage;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const x = t.xrays;
  const toast = useToast();
  const [form, setForm] = useState({
    image_type: image.image_type,
    taken_on: image.taken_on,
    teeth: (image.teeth || "").split(",").filter(Boolean).join(", "),
    description: image.description || "",
  });
  const [teethError, setTeethError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const { teeth, bad } = parseTeeth(form.teeth);
    if (bad.length) {
      setTeethError(x.teethInvalid(bad.join(t.files.separator)));
      return;
    }
    setSaving(true);
    try {
      await updateDoc("Dental Image", image.name, {
        image_type: form.image_type,
        taken_on: form.taken_on || null,
        teeth: teeth.join(","),
        description: form.description.trim(),
      });
      toast.success(x.detailsSaved);
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err, x.detailsFailed));
      setSaving(false);
    }
  };

  return (
    <Modal open priority title={x.detailsTitle} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 text-gray-800">
        <Field label={x.typeFilter}>
          <ImageTypeSelect value={form.image_type} onChange={(image_type) => setForm({ ...form, image_type })} />
        </Field>
        <Field label={x.takenOn} required>
          <DateInput dir="ltr" value={form.taken_on} onChange={(e) => setForm({ ...form, taken_on: e.target.value })} required />
        </Field>
        <Field label={x.teeth} hint={x.teethHint} error={teethError}>
          <TextInput
            value={form.teeth}
            dir="ltr"
            inputMode="numeric"
            aria-invalid={Boolean(teethError)}
            onChange={(e) => {
              setForm({ ...form, teeth: e.target.value });
              setTeethError("");
            }}
          />
        </Field>
        <Field label={x.description} hint={x.descriptionHint}>
          <TextArea value={form.description} dir="auto" onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" loading={saving}>
            {x.saveDetails}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
