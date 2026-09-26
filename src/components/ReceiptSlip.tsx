"use client";

import { useState, useSyncExternalStore } from "react";
import { Printer, Settings2 } from "lucide-react";
import { Button, Field, NumberInput, Segmented } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { formatDate, formatDateTime, todayISO, toISODate } from "@/lib/format";
import {
  buildReceiptSlip,
  DEFAULT_SLIP_PAPER,
  normalizeSlipPaper,
  printHtml,
  readSlipPaper,
  saveSlipPaper,
  SLIP_WIDTHS,
  subscribeSlipPaper,
  type SlipData,
  type SlipPaper,
  type SlipTextSize,
} from "@/lib/receiptSlip";

const defaultPaper = () => DEFAULT_SLIP_PAPER;

/** "26 Sep 2026, 10:42 AM" for now. */
function now(): string {
  const date = new Date();
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return formatDateTime(`${toISODate(date)} ${time}`);
}

function print(data: SlipData, paper: SlipPaper): boolean {
  const clean = normalizeSlipPaper(paper);
  return printHtml(buildReceiptSlip({ ...data, printedAt: now() }, clean), { pageWidthMm: clean.widthMm });
}

/**
 * The "Receipt slip" row under a payment receipt: print a slip for a thermal receipt printer (58 or 80 mm), and
 * set this computer's paper size. Hidden on paper. `data` is null while the receipt is still loading.
 */
export default function ReceiptSlipControls({ data }: { data: SlipData | null }) {
  const toast = useToast();
  const paper = useSyncExternalStore(subscribeSlipPaper, readSlipPaper, defaultPaper);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handlePrint = () => {
    if (data && !print(data, paper)) toast.error("Could not start printing.");
  };

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 print:hidden">
      <p className="text-sm text-gray-600">Receipt slip for a receipt printer ({paper.widthMm} mm paper)</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={Settings2} onClick={() => setSettingsOpen(true)}>
          Slip Settings
        </Button>
        <Button size="sm" icon={Printer} onClick={handlePrint} disabled={!data}>
          Print Slip
        </Button>
      </div>
      {settingsOpen && <SlipSettingsDialog paper={paper} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

const TEXT_SIZES: Array<{ value: SlipTextSize; label: string }> = [
  { value: "small", label: "Small" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
];

function SlipSettingsDialog({ paper, onClose }: { paper: SlipPaper; onClose: () => void }) {
  const toast = useToast();
  const { money, clinicName, settings } = useSettings();
  const { displayName } = useSession();
  const standard = (SLIP_WIDTHS as readonly number[]).includes(paper.widthMm);
  const [width, setWidth] = useState<string>(standard ? String(paper.widthMm) : "other");
  const [otherWidth, setOtherWidth] = useState(standard ? "" : String(paper.widthMm));
  const [margin, setMargin] = useState(String(paper.marginMm));
  const [textSize, setTextSize] = useState<SlipTextSize>(paper.textSize);

  /** The settings as typed, or null (with a message) when a number is missing or out of range. */
  const draft = (): SlipPaper | null => {
    const widthMm = width === "other" ? Number(otherWidth) : Number(width);
    if (width === "other" && (otherWidth === "" || widthMm < 40 || widthMm > 120)) {
      toast.error("Enter a paper width between 40 and 120 mm.");
      return null;
    }
    const marginMm = Number(margin);
    if (margin === "" || !Number.isFinite(marginMm) || marginMm > 10) {
      toast.error("Enter a side margin between 0 and 10 mm.");
      return null;
    }
    return normalizeSlipPaper({ widthMm, marginMm, textSize });
  };

  const printTest = () => {
    // A long name, a long treatment and big amounts: the worst case for a narrow roll.
    const sample: SlipData = {
      clinicName,
      clinicAddress: settings.address,
      clinicPhone: settings.phone,
      taxNumber: settings.tax_number,
      receiptNo: "TEST SLIP",
      date: formatDate(todayISO()),
      patient: "Mohammed Abdulrahman Al-Kadhimi",
      forWhat: "Root canal and crown · tooth 36",
      method: "Cash",
      amount: money(1250000),
      balance: { label: "Left on this treatment", amount: money(2750000) },
      printedBy: displayName,
    };
    const paper = draft();
    if (paper && !print(sample, paper)) toast.error("Could not start printing.");
  };

  const handleSave = () => {
    const paper = draft();
    if (!paper) return;
    saveSlipPaper(paper);
    toast.success("Slip settings saved on this computer.");
    onClose();
  };

  return (
    <Modal open title="Receipt Slip Settings" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Kept on this computer only. The print dialog opens on the printer used last: check that the receipt printer is
          chosen.
        </p>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1.5">Paper width</p>
          <Segmented
            label="Paper width"
            value={width}
            onChange={setWidth}
            options={[
              { value: "58", label: "58 mm" },
              { value: "80", label: "80 mm" },
              { value: "other", label: "Other" },
            ]}
          />
        </div>
        {width === "other" && (
          <Field label="Width (mm)" hint="Between 40 and 120.">
            <NumberInput decimals={false} value={otherWidth} onChange={(e) => setOtherWidth(e.target.value)} />
          </Field>
        )}
        <Field label="Side margin (mm)" hint="Space the printer cannot print on. Most need 2 to 4 mm.">
          <NumberInput value={margin} onChange={(e) => setMargin(e.target.value)} />
        </Field>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1.5">Text size</p>
          <Segmented label="Text size" value={textSize} onChange={setTextSize} options={TEXT_SIZES} />
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="secondary" icon={Printer} onClick={printTest}>
            Print Test Slip
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
