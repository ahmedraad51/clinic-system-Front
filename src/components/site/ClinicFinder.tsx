"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Button, Field, LinkButton, TextInput } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { CLOUD_DOMAIN, clinicAddress, isValidClinicAddress } from "@/lib/deployment";

/**
 * "Go to your clinic": the clinic's own web address in the cloud (alnoor → alnoor.dentclinic.example, same port).
 * A single-clinic install (no CLOUD_DOMAIN) just opens the clinic.
 */
export default function ClinicFinder() {
  const { t } = useI18n();
  const s = t.site;
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const clean = slug.trim().toLowerCase();

  if (!CLOUD_DOMAIN) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">{s.singleClinic}</p>
        <LinkButton href="/dashboard" icon={ArrowRight}>
          {s.openClinic}
        </LinkButton>
      </div>
    );
  }

  const go = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidClinicAddress(clean)) {
      setError(s.findInvalid);
      return;
    }
    const { protocol, port } = window.location;
    window.location.assign(`${protocol}//${clinicAddress(clean)}${port ? `:${port}` : ""}/dashboard`);
  };

  return (
    <form onSubmit={go} noValidate className="space-y-3">
      <Field label={s.findLabel} error={error} hint={clean && !error ? s.findPreview(clinicAddress(clean)) : undefined}>
        <div className="flex gap-2" dir="ltr">
          <TextInput
            name="clinic_address"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setError("");
            }}
            placeholder={s.findPlaceholder}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            className="flex-1"
          />
          <span className="self-center text-sm text-gray-600 whitespace-nowrap">.{CLOUD_DOMAIN}</span>
        </div>
      </Field>
      <Button type="submit" icon={ArrowRight}>
        {s.findButton}
      </Button>
    </form>
  );
}
