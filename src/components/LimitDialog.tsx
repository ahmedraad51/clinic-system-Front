"use client";

import { useState, type ReactNode } from "react";
import { Gauge, Send } from "lucide-react";
import UpgradeDialog from "@/components/UpgradeDialog";
import { Button, LinkButton } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSubscription } from "@/context/SubscriptionContext";
import type { LimitKind, Subscription } from "@/lib/subscription";

/**
 * "Your plan's limit": why one more doctor, user or file cannot be added, and (for the manager) a way to ask for a
 * bigger plan. The server must refuse it too; this only says so first.
 */
export function LimitDialog({ kind, subscription, onClose }: { kind: LimitKind; subscription: Subscription; onClose: () => void }) {
  const { t } = useI18n();
  const p = t.plan;
  const { can, readOnly } = useSession();
  const { refresh } = useSubscription();
  const [asking, setAsking] = useState(false);
  const planName = t.site.plans[subscription.plan].name;
  const text =
    kind === "doctors"
      ? p.limitDoctors(subscription.limits.doctors ?? 0, planName)
      : kind === "users"
        ? p.limitUsers(subscription.limits.users ?? 0, planName)
        : p.limitStorage(p.gb(subscription.limits.storageGb), planName);
  const manager = can("manage_users") && !readOnly;

  if (asking) return <UpgradeDialog current={subscription.plan} onClose={onClose} onSent={refresh} />;
  return (
    <Modal open title={p.limitTitle} onClose={onClose}>
      <div className="space-y-4" data-testid="limit-dialog" data-kind={kind}>
        <div className="flex items-start gap-3">
          <Gauge size={22} className="shrink-0 mt-0.5 text-primary-700" aria-hidden="true" />
          <p className="text-sm text-gray-800">{text}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {manager && (
            <>
              <Button icon={Send} onClick={() => setAsking(true)}>
                {p.requestUpgrade}
              </Button>
              <LinkButton href="/settings/plan" variant="secondary">
                {p.seePlan}
              </LinkButton>
            </>
          )}
          <Button variant={manager ? "ghost" : "secondary"} onClick={onClose}>
            {t.common.close}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Checks a plan limit before adding something: `check(kind, addMb)` is true when there is room; when there is not,
 * it opens the limit dialog (render `dialog` somewhere on the page) and is false.
 */
export function useLimit(): { check: (kind: LimitKind, addMb?: number) => boolean; dialog: ReactNode } {
  const { subscription, overLimit } = useSubscription();
  const [shown, setShown] = useState<LimitKind | null>(null);
  const check = (kind: LimitKind, addMb = 0) => {
    if (!overLimit(kind, addMb)) return true;
    setShown(kind);
    return false;
  };
  const dialog = shown && subscription ? <LimitDialog kind={shown} subscription={subscription} onClose={() => setShown(null)} /> : null;
  return { check, dialog };
}
