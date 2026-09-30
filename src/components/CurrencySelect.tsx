"use client";

import { SelectInput } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";

/**
 * Picks the clinic's own currency or the second one (Clinic Settings). The value is the currency code; an empty
 * value shows as the clinic's own. Draws nothing when the clinic takes one currency only.
 */
export default function CurrencySelect({
  value,
  onChange,
  name = "currency",
  disabled,
  id,
}: {
  value: string;
  onChange: (code: string) => void;
  name?: string;
  disabled?: boolean;
  id?: string;
}) {
  const { t } = useI18n();
  const { currency, currencies } = useSettings();
  if (currencies.length < 2) return null;
  return (
    <SelectInput id={id} name={name} value={value || currency} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      {currencies.map((code) => (
        <option key={code} value={code}>
          {t.money.names[code] ?? code}
        </option>
      ))}
    </SelectInput>
  );
}
