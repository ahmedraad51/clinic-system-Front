"use client";

import { Check } from "lucide-react";
import { Badge, Button, CARD_CLASS } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { PLAN_KEYS, PLANS, type PlanKey } from "@/config/sales";
import { cx, formatMoney } from "@/lib/format";

/** The three plans with their prices (src/config/sales.ts) and limits; choosing one fills in the trial form. */
export default function SitePlans({ onChoose }: { onChoose: (plan: PlanKey) => void }) {
  const { t } = useI18n();
  const s = t.site;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
      {PLAN_KEYS.map((key) => {
        const plan = PLANS[key];
        const text = s.plans[key];
        return (
          <article
            key={key}
            data-plan={key}
            aria-labelledby={`plan-${key}`}
            className={cx(CARD_CLASS, "relative p-6 flex flex-col", plan.highlight && "ring-2 ring-primary-500")}
          >
            {plan.highlight && (
              <span className="absolute -top-3 start-6">
                <Badge tone="primary">{s.mostChosen}</Badge>
              </span>
            )}
            <h3 id={`plan-${key}`} className="text-lg font-semibold text-gray-900">
              {text.name}
            </h3>
            <p className="mt-1 text-sm text-gray-600">{text.text}</p>
            <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
              <span data-testid={`price-${key}`} className="text-3xl font-semibold text-gray-900 whitespace-nowrap">
                {formatMoney(plan.price, plan.currency)}
              </span>
              <span className="text-sm text-gray-600">{plan.period === "month" ? s.perMonth : s.perYear}</span>
            </p>
            {plan.setupFee > 0 && <p className="mt-1 text-sm text-gray-600">{s.setupFee(formatMoney(plan.setupFee, plan.currency))}</p>}
            <ul className="mt-5 space-y-2 text-sm text-gray-800 flex-1">
              {[s.limits.doctors(plan.limits.doctors), s.limits.users(plan.limits.users), s.limits.storage(plan.limits.storageGb), ...text.points].map(
                (point) => (
                  <li key={point} className="flex items-start gap-2">
                    <Check size={16} className="shrink-0 mt-0.5 text-green-700" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ),
              )}
            </ul>
            <Button className="mt-6 w-full" variant={plan.highlight ? "primary" : "secondary"} onClick={() => onChoose(key)}>
              {s.choosePlan}
            </Button>
          </article>
        );
      })}
    </div>
  );
}
