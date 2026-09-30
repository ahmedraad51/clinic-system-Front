"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import AppointmentForm, {
  EMPTY_APPOINTMENT, appointmentPayload, appointmentToForm, type AppointmentFormData,
} from "@/components/forms/AppointmentForm";
import PatientForm, { EMPTY_PATIENT, patientPayload, type PatientFormData } from "@/components/forms/PatientForm";
import ExpenseForm, { emptyExpense, expensePayload, expenseToForm, type ExpenseFormData } from "@/components/forms/ExpenseForm";
import PaymentForm, { emptyPayment, paymentPayload, paymentToForm, type PaymentFormData } from "@/components/forms/PaymentForm";
import TreatmentForm, { EMPTY_TREATMENT, treatmentPayload, treatmentToForm, type TreatmentFormData } from "@/components/forms/TreatmentForm";
import { NotFoundCard, PageLoading } from "@/components/ui";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
import { bumpData } from "@/lib/dataVersion";
import { createDoc, updateDoc } from "@/lib/frappe";
import { useDocument } from "@/lib/hooks";
import { appointmentHref, patientHref, paymentHref, treatmentHref } from "@/lib/links";
import type { Appointment, Expense, Patient, Payment, PermissionKey, TreatmentPlan } from "@/lib/types";

/**
 * New and edit forms in a dialog over the page they are opened from, instead of a page of their own: a dialog in
 * the middle of the screen for a treatment plan, a payment or an appointment (wide, so the doctor's day and the free
 * times fit), and a side panel for the long Add Patient form. They open with what the page already knows filled in
 * (the patient, the plan, the tooth, the time clicked in the calendar). After saving the page stays: a message with a
 * link to the new record, and the lists and the record behind load again (bumpData). Closing with unsaved changes
 * asks first; Escape closes; on a phone they fill the screen. The old pages (/treatments/new …) still work.
 */
export type RecordDialog =
  | { kind: "newAppointment"; prefill?: Partial<AppointmentFormData>; patientName?: string }
  | { kind: "editAppointment"; id: string }
  | { kind: "newTreatment"; prefill?: { patient?: string; tooth?: string }; patientName?: string }
  | { kind: "editTreatment"; id: string }
  | { kind: "newPayment"; prefill?: { patient?: string; treatment?: string }; patientName?: string }
  | { kind: "editPayment"; id: string }
  | { kind: "newPatient" }
  | { kind: "newExpense"; prefill?: { doctor?: string } }
  | { kind: "editExpense"; id: string };

const RecordDialogsContext = createContext<((dialog: RecordDialog) => void) | null>(null);

/** Opens a new or edit form in a dialog: \`const open = useRecordDialogs(); open({ kind: "newTreatment", … })\`. */
export function useRecordDialogs(): (dialog: RecordDialog) => void {
  const open = useContext(RecordDialogsContext);
  if (!open) throw new Error("useRecordDialogs must be used within RecordDialogsProvider");
  return open;
}

export function RecordDialogsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The page it was opened on: following a link out of the dialog (an existing patient, the message's Open link)
  // leaves that page, and the dialog goes with it.
  const [current, setCurrent] = useState<{ dialog: RecordDialog; path: string; key: number } | null>(null);
  // A new key for each opening, so a form never keeps what was typed the time before.
  const openings = useRef(0);
  const open = useCallback(
    (dialog: RecordDialog) => {
      openings.current += 1;
      const key = openings.current;
      setCurrent({ dialog, path: pathname, key });
    },
    [pathname],
  );
  // Forget it too, so coming back to that page does not open it again.
  if (current && current.path !== pathname) setCurrent(null);
  // Closes only the opening that asks: a save that ends after its dialog was closed and another one opened
  // leaves the new one alone.
  const close = useCallback((key: number) => setCurrent((prev) => (prev && prev.key === key ? null : prev)), []);
  const value = useMemo(() => open, [open]);
  return (
    <RecordDialogsContext.Provider value={value}>
      {children}
      {current && current.path === pathname && (
        <DialogFor key={current.key} dialog={current.dialog} onClose={() => close(current.key)} />
      )}
    </RecordDialogsContext.Provider>
  );
}

/**
 * The frame: a Modal (or side panel) that asks before closing when the form has unsaved changes. \`children\` gets
 * the two callbacks every form takes: report whether it has changes, and cancel.
 */
function FormDialog({
  title,
  size = "lg",
  side = false,
  onClose,
  children,
}: {
  title: string;
  size?: "lg" | "xl";
  side?: boolean;
  onClose: () => void;
  children: (props: { onDirtyChange: (dirty: boolean) => void; onCancel: () => void }) => ReactNode;
}) {
  const { t } = useI18n();
  const [dirty, setDirty] = useState(false);
  const [asking, setAsking] = useState(false);
  const requestClose = useCallback(() => {
    if (dirty) setAsking(true);
    else onClose();
  }, [dirty, onClose]);
  return (
    <>
      <Modal open title={title} size={size} side={side} fullScreenOnPhone onClose={requestClose}>
        {children({ onDirtyChange: setDirty, onCancel: requestClose })}
      </Modal>
      <ConfirmDialog
        priority
        open={asking}
        title={t.history.leaveTitle}
        message={<p>{t.history.leaveText}</p>}
        confirmLabel={t.history.leaveConfirm}
        onCancel={() => setAsking(false)}
        onConfirm={onClose}
      />
    </>
  );
}

/** What each dialog needs; a button without the check never opens a form the user may not save. */
const NEEDS: Record<RecordDialog["kind"], PermissionKey> = {
  newAppointment: "add_appointments",
  editAppointment: "edit_appointments",
  newTreatment: "add_treatments",
  editTreatment: "edit_treatments",
  newPayment: "add_payments",
  editPayment: "add_payments",
  newPatient: "add_patients",
  newExpense: "add_expenses",
  editExpense: "add_expenses",
};

function DialogFor({ dialog, onClose }: { dialog: RecordDialog; onClose: () => void }) {
  const { can } = useSession();
  if (!can(NEEDS[dialog.kind])) return null;
  switch (dialog.kind) {
    case "newAppointment":
      return <NewAppointmentDialog prefill={dialog.prefill} patientName={dialog.patientName} onClose={onClose} />;
    case "editAppointment":
      return <EditAppointmentDialog id={dialog.id} onClose={onClose} />;
    case "newTreatment":
      return <NewTreatmentDialog prefill={dialog.prefill} patientName={dialog.patientName} onClose={onClose} />;
    case "editTreatment":
      return <EditTreatmentDialog id={dialog.id} onClose={onClose} />;
    case "newPayment":
      return <NewPaymentDialog prefill={dialog.prefill} patientName={dialog.patientName} onClose={onClose} />;
    case "editPayment":
      return <EditPaymentDialog id={dialog.id} onClose={onClose} />;
    case "newPatient":
      return <NewPatientPanel onClose={onClose} />;
    case "newExpense":
      return <NewExpenseDialog prefill={dialog.prefill} onClose={onClose} />;
    case "editExpense":
      return <EditExpenseDialog id={dialog.id} onClose={onClose} />;
  }
}

/* ------------------------------------------------------------ appointments -- */

function NewAppointmentDialog({
  prefill,
  patientName,
  onClose,
}: {
  prefill?: Partial<AppointmentFormData>;
  patientName?: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const initial: AppointmentFormData = { ...EMPTY_APPOINTMENT, ...prefill };
  const handleSubmit = async (data: AppointmentFormData) => {
    const appointment = await createDoc<Appointment>("Appointment", appointmentPayload(data));
    toast.success(t.appointments.booked, { label: t.common.open, href: appointmentHref(appointment.name) });
    bumpData();
    onClose();
  };
  return (
    <FormDialog title={t.appointments.newAppointment} size="xl" onClose={onClose}>
      {(dialog) => (
        <AppointmentForm
          initial={initial}
          patientLabel={patientName}
          submitLabel={t.appointments.book}
          cancelHref="/appointments"
          onSubmit={handleSubmit}
          {...dialog}
        />
      )}
    </FormDialog>
  );
}

function EditAppointmentDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const { doc, loading, notFound, error } = useDocument<Appointment>("Appointment", id);
  const handleSubmit = async (data: AppointmentFormData) => {
    await updateDoc("Appointment", id, appointmentPayload(data));
    toast.success(t.appointments.saved);
    bumpData();
    onClose();
  };
  return (
    <FormDialog title={t.appointments.editTitle} size="xl" onClose={onClose}>
      {(dialog) =>
        loading ? (
          <PageLoading />
        ) : notFound || !doc ? (
          <NotFoundCard error={error} what={t.enums.doctype.Appointment} backHref="/appointments" backLabel={t.appointments.backToList} />
        ) : (
          <AppointmentForm
            initial={appointmentToForm(doc)}
            currentName={id}
            patientLabel={doc.patient_name}
            doctorLabel={doc.doctor_name}
            showStatus
            submitLabel={t.common.saveChanges}
            cancelHref={appointmentHref(id)}
            onSubmit={handleSubmit}
            {...dialog}
          />
        )
      }
    </FormDialog>
  );
}

/* ---------------------------------------------------------- treatment plans -- */

function NewTreatmentDialog({
  prefill,
  patientName,
  onClose,
}: {
  prefill?: { patient?: string; tooth?: string };
  patientName?: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const initial: TreatmentFormData = { ...EMPTY_TREATMENT, patient: prefill?.patient ?? "", tooth_number: prefill?.tooth ?? "" };
  const handleSubmit = async (data: TreatmentFormData) => {
    // New plans always start as Planned; the status changes on the plan page.
    const plan = await createDoc<TreatmentPlan>("Treatment Plan", { ...treatmentPayload(data), status: "Planned" });
    toast.success(t.treatments.created, { label: t.common.open, href: treatmentHref(plan.name) });
    bumpData();
    onClose();
  };
  return (
    <FormDialog title={t.treatments.newTitle} onClose={onClose}>
      {(dialog) => (
        <TreatmentForm
          initial={initial}
          patientLabel={patientName}
          submitLabel={t.treatments.saveTreatment}
          cancelHref="/treatments"
          onSubmit={handleSubmit}
          {...dialog}
        />
      )}
    </FormDialog>
  );
}

function EditTreatmentDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const { doc, loading, notFound, error } = useDocument<TreatmentPlan>("Treatment Plan", id);
  const handleSubmit = async (data: TreatmentFormData) => {
    await updateDoc("Treatment Plan", id, treatmentPayload(data));
    toast.success(t.treatments.saved);
    bumpData();
    onClose();
  };
  return (
    <FormDialog title={t.treatments.editTitle} onClose={onClose}>
      {(dialog) =>
        loading ? (
          <PageLoading />
        ) : notFound || !doc ? (
          <NotFoundCard error={error} what={t.treatments.what} backHref="/treatments" backLabel={t.treatments.backToList} />
        ) : (
          <TreatmentForm
            initial={treatmentToForm(doc)}
            patientLabel={doc.patient_name}
            doctorLabel={doc.doctor_name}
            showStatus
            currencyLocked={Number(doc.paid_amount) > 0}
            submitLabel={t.common.saveChanges}
            cancelHref={treatmentHref(id)}
            onSubmit={handleSubmit}
            {...dialog}
          />
        )
      }
    </FormDialog>
  );
}

/* ----------------------------------------------------------------- payments -- */

function NewPaymentDialog({
  prefill,
  patientName,
  onClose,
}: {
  prefill?: { patient?: string; treatment?: string };
  patientName?: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const initial: PaymentFormData = { ...emptyPayment(), patient: prefill?.patient ?? "", treatment_plan: prefill?.treatment ?? "" };
  const handleSubmit = async (data: PaymentFormData) => {
    const payment = await createDoc<Payment>("Payment", paymentPayload(data));
    toast.success(t.payments.recorded, { label: t.common.open, href: paymentHref(payment.name) });
    bumpData();
    onClose();
  };
  return (
    <FormDialog title={t.payments.newTitle} onClose={onClose}>
      {(dialog) => (
        <PaymentForm
          initial={initial}
          patientLabel={patientName}
          submitLabel={t.payments.savePayment}
          cancelHref="/payments"
          onSubmit={handleSubmit}
          {...dialog}
        />
      )}
    </FormDialog>
  );
}

/* ---------------------------------------------------------------- expenses -- */

function NewExpenseDialog({ prefill, onClose }: { prefill?: { doctor?: string }; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const initial: ExpenseFormData = { ...emptyExpense(), doctor: prefill?.doctor ?? "" };
  const handleSubmit = async (data: ExpenseFormData) => {
    await createDoc<Expense>("Expense", expensePayload(data));
    toast.success(t.expenses.added);
    bumpData();
    onClose();
  };
  return (
    <FormDialog title={t.expenses.newTitle} onClose={onClose}>
      {(dialog) => <ExpenseForm initial={initial} submitLabel={t.expenses.save} onSubmit={handleSubmit} {...dialog} />}
    </FormDialog>
  );
}

function EditExpenseDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const { doc, loading, notFound, error } = useDocument<Expense>("Expense", id);
  const handleSubmit = async (data: ExpenseFormData) => {
    await updateDoc("Expense", id, expensePayload(data));
    toast.success(t.expenses.saved);
    bumpData();
    onClose();
  };
  return (
    <FormDialog title={t.expenses.editTitle} onClose={onClose}>
      {(dialog) =>
        loading ? (
          <PageLoading />
        ) : notFound || !doc ? (
          <NotFoundCard error={error} what={label(t.enums.doctype, "Expense")} backHref="/expenses" backLabel={t.expenses.backToList} />
        ) : (
          <ExpenseForm
            initial={expenseToForm(doc)}
            doctorLabel={doc.doctor_name}
            submitLabel={t.common.saveChanges}
            onSubmit={handleSubmit}
            {...dialog}
          />
        )
      }
    </FormDialog>
  );
}

function EditPaymentDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const { doc, loading, notFound, error } = useDocument<Payment>("Payment", id);
  const handleSubmit = async (data: PaymentFormData) => {
    await updateDoc("Payment", id, paymentPayload(data));
    toast.success(t.payments.saved);
    bumpData();
    onClose();
  };
  return (
    <FormDialog title={t.payments.editTitle} onClose={onClose}>
      {(dialog) =>
        loading ? (
          <PageLoading />
        ) : notFound || !doc ? (
          <NotFoundCard error={error} what={label(t.enums.doctype, "Payment")} backHref="/payments" backLabel={t.payments.backToList} />
        ) : (
          <PaymentForm
            initial={paymentToForm(doc)}
            patientLabel={doc.patient_name}
            submitLabel={t.common.saveChanges}
            cancelHref={paymentHref(id)}
            onSubmit={handleSubmit}
            {...dialog}
          />
        )
      }
    </FormDialog>
  );
}

/* ----------------------------------------------------------------- patients -- */

function NewPatientPanel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const handleSubmit = async (data: PatientFormData) => {
    const patient = await createDoc<Patient>("Patient", patientPayload(data));
    toast.success(t.patients.added(patient.full_name), { label: t.common.open, href: patientHref(patient.name) });
    bumpData();
    onClose();
  };
  return (
    <FormDialog title={t.patients.newTitle} side onClose={onClose}>
      {(dialog) => (
        <PatientForm initial={EMPTY_PATIENT} submitLabel={t.patients.savePatient} cancelHref="/patients" onSubmit={handleSubmit} {...dialog} />
      )}
    </FormDialog>
  );
}
