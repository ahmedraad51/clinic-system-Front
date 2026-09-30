"use client";

import { useSyncExternalStore } from "react";
import { Card, Segmented } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { readZoom, saveZoom, subscribeZoom, ZOOM_LEVELS } from "@/lib/display";

const serverZoom = () => 100;

/** Profile page: make text and buttons smaller or bigger on this computer only. */
export default function ScreenSizeCard() {
  const { t } = useI18n();
  const zoom = useSyncExternalStore(subscribeZoom, readZoom, serverZoom);
  return (
    <Card title={t.profile.screenSizeTitle}>
      <p className="text-sm text-gray-600 mb-3">{t.profile.screenSizeText}</p>
      <Segmented
        label={t.profile.screenSize}
        value={String(zoom)}
        onChange={(value) => saveZoom(Number(value))}
        options={ZOOM_LEVELS.map((level) => ({ value: String(level), label: t.profile.zoomLevel(level) }))}
      />
    </Card>
  );
}
