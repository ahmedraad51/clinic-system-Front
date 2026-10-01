"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { CARD_CLASS, IconTile, LinkButton } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { cx } from "@/lib/format";

const STEP_KEYS = ["clinic", "money", "hours", "doctors", "prices", "staff"] as const;
/** Set once the manager of a new clinic was sent to the wizard in this browser visit (they may go back). */
const OFFERED_KEY = "setup_offered";

/** The wizard was opened in this visit: the dashboard does not send the manager there again (Skip for Now). */
export function markSetupOffered() {
  try {
    sessionStorage.setItem(OFFERED_KEY, "1");
  } catch {
    // No storage: the dashboard may offer it again.
  }
}

/**
 * On the dashboard, for the manager while the clinic's first-run setup (/setup) is not finished. A brand-new clinic
 * (setup_status empty) sends the manager to the wizard once per visit; a skipped one shows this card instead.
 */
export default function SetupCard() {
  const { t } = useI18n();
  const w = t.setup;
  const router = useRouter();
  const { can, readOnly } = useSession();
  const { settings, loaded } = useSettings();
  const manager = can("manage_users") && !readOnly;
  const status = settings.setup_status ?? "";
  const isNew = loaded && manager && !status;

  useEffect(() => {
    if (!isNew) return;
    try {
      if (sessionStorage.getItem(OFFERED_KEY)) return;
      sessionStorage.setItem(OFFERED_KEY, "1");
    } catch {
      // No storage: offer it every time, the manager can still skip it.
    }
    router.replace("/setup");
  }, [isNew, router]);

  if (!loaded || !manager || status === "done") return null;
  const at = Math.min(Number(settings.setup_step) || 0, STEP_KEYS.length - 1);
  return (
    <section data-testid="setup-card" className={cx(CARD_CLASS, "px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4")}>
      <IconTile icon={Wand2} hue="primary" />
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-gray-900">{w.finishTitle}</h2>
        <p className="text-sm text-gray-600 mt-0.5">
          {Number(settings.setup_step) > 0 ? w.finishText(w.steps[STEP_KEYS[at]], at + 1, STEP_KEYS.length) : w.finishStart}
        </p>
      </div>
      <LinkButton href="/setup">{w.continueSetup}</LinkButton>
    </section>
  );
}
