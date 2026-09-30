"use client";

import { useState, useSyncExternalStore } from "react";
import { Printer, Settings2 } from "lucide-react";
import { Button, Field, NumberInput, Segmented } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
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
  const { t } = useI18n();
  const s = t.receipt.slip;
  const paper = useSyncExternalStore(subscribeSlipPaper, readSlipPaper, defaultPaper);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handlePrint = () => {
    if (data && !print(data, paper)) toast.error(s.printFailed);
  };

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 print:hidden">
      <p className="text-sm text-gray-600">{s.row(paper.widthMm)}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={Settings2} onClick={() => setSettingsOpen(true)}>
          {s.settings}
        </Button>
        <Button size="sm" icon={Printer} onClick={handlePrint} disabled={!data}>
          {s.print}
        </Button>
      </div>
      {settingsOpen && <SlipSettingsDialog paper={paper} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

const TEXT_SIZES: readonly SlipTextSize[] = ["small", "normal", "large"];

function SlipSettingsDialog({ paper, onClose }: { paper: SlipPaper; onClose: () => void }) {
  const toast = useToast();
  const { t } = useI18n();
  const s = t.receipt.slip;
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
      toast.error(s.widthError);
      return null;
    }
    const marginMm = Number(margin);
    if (margin === "" || !Number.isFinite(marginMm) || marginMm > 10) {
      toast.error(s.marginError);
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
      receiptNo: s.testNo,
      date: formatDate(todayISO()),
      patient: s.testPatient,
      forWhat: s.testFor,
      method: label(t.enums.paymentMethod, "Cash"),
      amount: money(1250000),
      balance: { label: s.leftOnTreatment, amount: money(2750000) },
      printedBy: displayName,
    };
    const paper = draft();
    if (paper && !print(sample, paper)) toast.error(s.printFailed);
  };

  const handleSave = () => {
    const paper = draft();
    if (!paper) return;
    saveSlipPaper(paper);
    toast.success(s.saved);
    onClose();
  };

  return (
    <Modal open title={s.dialogTitle} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{s.dialogText}</p>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1.5">{s.paperWidth}</p>
          <Segmented
            label={s.paperWidth}
            value={width}
            onChange={setWidth}
            options={[
              { value: "58", label: s.mm(58) },
              { value: "80", label: s.mm(80) },
              { value: "other", label: s.otherWidth },
            ]}
          />
        </div>
        {width === "other" && (
          <Field label={s.widthLabel} hint={s.widthHint}>
            <NumberInput decimals={false} value={otherWidth} onChange={(e) => setOtherWidth(e.target.value)} />
          </Field>
        )}
        <Field label={s.marginLabel} hint={s.marginHint}>
          <NumberInput value={margin} onChange={(e) => setMargin(e.target.value)} />
        </Field>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1.5">{s.textSize}</p>
          <Segmented
            label={s.textSize}
            value={textSize}
            onChange={setTextSize}
            options={TEXT_SIZES.map((size) => ({ value: size, label: s[size] }))}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="secondary" icon={Printer} onClick={printTest}>
            {s.printTest}
          </Button>
          <Button onClick={handleSave}>{t.common.save}</Button>
        </div>
      </div>
    </Modal>
  );
}
