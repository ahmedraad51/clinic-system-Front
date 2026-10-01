"use client";

import type { ReactNode } from "react";
import { MessageCircle, WifiOff } from "lucide-react";
import { tooltip } from "@/components/ui";
import { useConnectivity } from "@/context/ConnectivityContext";
import { useI18n } from "@/context/LanguageContext";
import { cx } from "@/lib/format";

const SIZES = {
  xs: "min-h-9 pointer-coarse:min-h-11 px-2.5 rounded-lg text-xs gap-1",
  sm: "min-h-9 pointer-coarse:min-h-11 px-3 rounded-xl text-sm gap-1.5",
  md: "min-h-11 px-4 rounded-xl text-sm gap-2",
} as const;

/**
 * Opens WhatsApp (a wa.me link, in a new tab). WhatsApp needs the internet, which a clinic server may not have: then
 * the button says so ("Needs internet") and opens nothing, so `onOpen` (marking a reminder as sent) does not run and
 * the item stays in its list until it can really be sent.
 */
export default function WhatsAppButton({
  href,
  onOpen,
  size = "sm",
  className,
  children,
}: {
  href: string;
  onOpen?: () => void;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
}) {
  const { internet } = useConnectivity();
  const { t } = useI18n();
  const base = cx("inline-flex items-center font-medium border whitespace-nowrap", SIZES[size], className);
  const iconSize = size === "xs" ? 13 : size === "sm" ? 15 : 16;

  if (!internet) {
    return (
      <button
        type="button"
        aria-disabled="true"
        data-needs-internet
        {...tooltip(t.connection.whatsappNeedsInternet)}
        className={cx(base, "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed")}
      >
        <WifiOff size={iconSize} aria-hidden="true" />
        {children}
        <span className="text-xs font-normal text-gray-500">({t.connection.needsInternet})</span>
      </button>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onOpen}
      className={cx(base, "bg-green-50 border-green-200 text-green-800 hover:bg-green-100")}
    >
      <MessageCircle size={iconSize} aria-hidden="true" />
      {children}
    </a>
  );
}
