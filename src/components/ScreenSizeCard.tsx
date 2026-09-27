"use client";

import { useSyncExternalStore } from "react";
import { Card, Segmented } from "@/components/ui";
import { readZoom, saveZoom, subscribeZoom, ZOOM_LEVELS } from "@/lib/display";

const serverZoom = () => 100;

/** Profile page: make text and buttons smaller or bigger on this computer only. */
export default function ScreenSizeCard() {
  const zoom = useSyncExternalStore(subscribeZoom, readZoom, serverZoom);
  return (
    <Card title="Screen Size on This Computer">
      <p className="text-sm text-gray-600 mb-3">
        Make text and buttons bigger on a screen read from a distance, or smaller on a small screen. Only this
        computer changes.
      </p>
      <Segmented
        label="Screen size"
        value={String(zoom)}
        onChange={(value) => saveZoom(Number(value))}
        options={ZOOM_LEVELS.map((level) => ({ value: String(level), label: `${level}%` }))}
      />
    </Card>
  );
}
