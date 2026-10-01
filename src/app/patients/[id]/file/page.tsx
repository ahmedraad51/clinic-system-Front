"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import ClinicLetterhead from "@/components/ClinicLetterhead";
import DentalChart from "@/components/DentalChart";
import RequirePermission from "@/components/Guard";
import MedicalAlerts from "@/components/MedicalAlerts";
import {
  Button, Card, LoadError, NotFoundCard, PageContainer, PageHeader, PageLoading, StatusBadge, Table, Td, Th,
} from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { label, messages } from "@/i18n";
import { errorMessage, fileHref, getList } from "@/lib/frappe";
import { currencyOf, sumByCurrency } from "@/lib/currency";
import { display, formatDate, formatTime, todayISO } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { medicalValue } from "@/lib/medical";
import { patientHref, routeId } from "@/lib/links";
import { IMAGE_FIELDS, imageTitle, isPdf, sortImages } from "@/lib/xrays";
import type {
  Appointment, DentalImage, Patient, Payment, PermissionKey, Prescription, TreatmentPlan, TreatmentSession,
} from "@/lib/types";

export default function PatientFilePage() {
  return (
    <RequirePermission permission="view_patients">
      <PatientFile />
    </RequirePermission>
  );
}

type SectionKey = "chart" | "treatments" | "appointments" | "prescriptions" | "payments" | "images";

/** The parts of the file, and what each needs; X-rays are left out at first (they take a lot of ink). */
const SECTIONS: Array<{ key: SectionKey; needs?: PermissionKey; on: boolean }> = [
  { key: "chart", on: true },
  { key: "treatments", needs: "view_treatments", on: true },
  { key: "appointments", needs: "view_appointments", on: true },
  { key: "prescriptions", needs: "view_treatments", on: true },
  { key: "payments", needs: "view_payments", on: true },
  { key: "images", on: false },
];

interface Data {
  id: string;
  plans: TreatmentPlan[];
  sessions: TreatmentSession[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  payments: Payment[];
  images: DentalImage[];
}

/**
 * The whole patient file on paper: details, medical information and alerts, the dental chart, treatment plans and
 * sessions, appointments, prescriptions, payments and, if chosen, the X-rays. Each part can be left out before
 * printing, and a part the user may not see is never loaded.
 */
function PatientFile() {
  const params = useParams();
  const id = routeId(params.id);
  const { t } = useI18n();
  const f = t.patientFile;
  const { can } = useSession();
  const { money, moneyTotals, currency } = useSettings();
  const { doc: patient, loading, notFound, error } = useDocument<Patient>("Patient", id);
  const allowed = SECTIONS.filter((section) => !section.needs || can(section.needs));
  const [chosen, setChosen] = useState<Record<SectionKey, boolean>>(
    () => Object.fromEntries(SECTIONS.map((section) => [section.key, section.on])) as Record<SectionKey, boolean>,
  );
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState("");
  const [version, setVersion] = useState(0);

  const seeTreatments = can("view_treatments");
  const seeAppointments = can("view_appointments");
  const seePayments = can("view_payments");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const mine = [["patient", "=", id]] as Array<[string, string, string]>;
      const none = <T,>() => Promise.resolve([] as T[]);
      try {
        const [plans, sessions, appointments, prescriptions, payments, images] = await Promise.all([
          seeTreatments || seePayments
            ? getList<TreatmentPlan>(
                "Treatment Plan",
                ["name", "treatment_type", "tooth_number", "status", "doctor_name", "currency", "total_cost", "paid_amount", "remaining_amount", "diagnosis"],
                { filters: mine, orderBy: "name asc", limit: 0 },
              )
            : none<TreatmentPlan>(),
          seeTreatments
            ? getList<TreatmentSession>("Treatment Session", ["name", "treatment_plan", "session_date", "doctor_name", "status", "notes"], {
                filters: mine,
                orderBy: "session_date asc",
                limit: 0,
              })
            : none<TreatmentSession>(),
          seeAppointments
            ? getList<Appointment>("Appointment", ["name", "appointment_date", "appointment_time", "doctor_name", "reason_for_visit", "status"], {
                filters: mine,
                orderBy: "appointment_date desc, appointment_time desc",
                limit: 0,
              })
            : none<Appointment>(),
          seeTreatments
            ? getList<Prescription>("Prescription", ["name", "prescription_date", "doctor_name", "summary", "notes"], {
                filters: mine,
                orderBy: "prescription_date desc",
                limit: 0,
              })
            : none<Prescription>(),
          seePayments
            ? getList<Payment>("Payment", ["name", "payment_date", "amount", "currency", "payment_method", "treatment_plan", "treatment_type"], {
                filters: mine,
                orderBy: "payment_date asc",
                limit: 0,
              })
            : none<Payment>(),
          getList<DentalImage>("Dental Image", IMAGE_FIELDS, { filters: mine, limit: 0 }),
        ]);
        if (!cancelled) {
          setData({ id, plans, sessions, appointments, prescriptions, payments, images: sortImages(images) });
          setFailed("");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setFailed(errorMessage(err, messages().patientFile.loadFailed));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, version, seeTreatments, seeAppointments, seePayments]);

  if (loading) return <PageLoading />;
  if (notFound || !patient) {
    return <NotFoundCard error={error} what={label(t.enums.doctype, "Patient")} backHref="/patients" backLabel={t.statement.backToPatients} />;
  }

  const ready = data?.id === id ? data : null;
  const show = (key: SectionKey) => allowed.some((section) => section.key === key) && chosen[key];
  const inCurrency = (row: { currency?: string }) => currencyOf(row, currency);
  const planName = new Map((ready?.plans ?? []).map((plan) => [plan.name, plan]));
  const planText = (plan?: TreatmentPlan) =>
    plan ? `${label(t.enums.treatmentType, plan.treatment_type)}${plan.tooth_number ? `${t.common.dot}${t.treatments.tooth} ${plan.tooth_number}` : ""}` : "";
  const medical: Array<[string, string | undefined]> = [
    [t.patientForm.allergies, patient.allergies],
    [t.patientForm.currentMedications, patient.current_medications],
    [t.patientForm.chronicDiseases, patient.chronic_diseases],
    [t.patientForm.medicalHistory, patient.medical_history],
    [t.patientForm.notes, patient.notes],
  ];
  const details: Array<[string, ReactNode]> = [
    [t.patients.patientId, <span key="id" dir="ltr">{patient.name}</span>],
    [t.patients.gender, label(t.enums.gender, patient.gender)],
    [t.patients.dateOfBirth, patient.date_of_birth ? formatDate(patient.date_of_birth) : ""],
    [t.patients.age, patient.age ? t.common.years(Number(patient.age)) : ""],
    [t.patients.phone, patient.phone_number ? <span key="phone" dir="ltr">{patient.phone_number}</span> : ""],
    [t.patients.secondaryPhone, patient.secondary_phone ? <span key="phone2" dir="ltr">{patient.secondary_phone}</span> : ""],
    [t.patients.email, patient.email ? <span key="email" dir="ltr">{patient.email}</span> : ""],
    [t.patients.address, patient.address],
  ];

  return (
    <PageContainer section="patients">
      <PageHeader
        title={f.title}
        subtitle={patient.full_name}
        back={{ href: patientHref(id), label: patient.full_name }}
        actions={
          <Button icon={Printer} onClick={() => window.print()} disabled={!ready}>
            {t.common.print}
          </Button>
        }
      />

      {/* What goes on paper. */}
      <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-1 print:hidden">
        <legend className="sr-only">{f.include}</legend>
        <span className="text-sm font-medium text-gray-700 me-1" aria-hidden="true">
          {f.include}:
        </span>
        {allowed.map((section) => (
          <label key={section.key} className="inline-flex items-center gap-2 min-h-11 text-sm text-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={chosen[section.key]}
              onChange={(event) => setChosen({ ...chosen, [section.key]: event.target.checked })}
              className="w-[1.125rem] h-[1.125rem]"
            />
            {f.sections[section.key]}
          </label>
        ))}
      </fieldset>

      {failed && (
        <LoadError
          message={failed}
          onRetry={() => {
            setFailed("");
            setVersion((v) => v + 1);
          }}
        />
      )}

      <Card className="print:shadow-none print:border-0">
        <ClinicLetterhead kind={f.kind} reference={patient.name} date={formatDate(todayISO())} />

        <FileSection title={f.details}>
          <p className="text-lg font-semibold text-gray-900 mb-3">{patient.full_name}</p>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
            {details.map(([name, value]) => (
              <div key={name}>
                <dt className="text-xs text-gray-500">{name}</dt>
                <dd className="text-sm font-medium text-gray-800 mt-0.5 break-words">{value || t.common.dash}</dd>
              </div>
            ))}
          </dl>
        </FileSection>

        <FileSection title={f.medical}>
          <div className="mb-4">
            <MedicalAlerts patient={patient} />
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {medical.map(([name, value]) => (
              <div key={name}>
                <dt className="text-xs text-gray-500">{name}</dt>
                <dd className="text-sm text-gray-800 mt-0.5 whitespace-pre-line">{medicalValue(value) || t.common.dash}</dd>
              </div>
            ))}
          </dl>
        </FileSection>

        {show("chart") && (
          // The chart has its own heading.
          <FileSection>
            <DentalChart key={patient.name} initialChart={patient.dental_chart} canEdit={false} patientAge={patient.age} sketch={patient.chart_sketch} />
          </FileSection>
        )}

        {!ready ? (
          !failed && <PageLoading />
        ) : (
          <>
            {show("treatments") && (
              <FileSection title={f.sections.treatments} testId="file-treatments">
                {ready.plans.length === 0 ? (
                  <p className="text-sm text-gray-500">{f.noTreatments}</p>
                ) : (
                  <Flush>
                    <Table>
                      <thead>
                        <tr>
                          <Th>{f.colTreatment}</Th>
                          <Th>{f.colDoctor}</Th>
                          <Th>{f.colStatus}</Th>
                          <Th className="text-end">{f.colCost}</Th>
                          <Th className="text-end">{f.colPaid}</Th>
                          <Th className="text-end">{f.colLeft}</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {ready.plans.map((plan) => (
                          <tr key={plan.name} className="break-inside-avoid">
                            <Td className="font-medium text-gray-800">
                              {planText(plan)}
                              {plan.diagnosis && <span className="block text-xs font-normal text-gray-500">{plan.diagnosis}</span>}
                            </Td>
                            <Td label={f.colDoctor}>{display(plan.doctor_name)}</Td>
                            <Td label={f.colStatus}>
                              <StatusBadge kind="treatment" status={plan.status} />
                            </Td>
                            <Td label={f.colCost} className="text-end whitespace-nowrap">{money(plan.total_cost, plan.currency)}</Td>
                            <Td label={f.colPaid} className="text-end whitespace-nowrap">{money(plan.paid_amount, plan.currency)}</Td>
                            <Td label={f.colLeft} className="text-end whitespace-nowrap">{money(plan.remaining_amount, plan.currency)}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Flush>
                )}
                {ready.sessions.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-gray-700 mt-5 mb-2">{f.sessions}</h3>
                    <Flush>
                      <Table>
                        <thead>
                          <tr>
                            <Th>{f.colDate}</Th>
                            <Th>{f.colTreatment}</Th>
                            <Th>{f.colDoctor}</Th>
                            <Th>{f.colStatus}</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {ready.sessions.map((session) => (
                            <tr key={session.name} className="break-inside-avoid">
                              <Td className="whitespace-nowrap">{formatDate(session.session_date)}</Td>
                              <Td label={f.colTreatment}>
                                {planText(planName.get(session.treatment_plan)) || session.treatment_plan}
                                {session.notes && <span className="block text-xs text-gray-500">{session.notes}</span>}
                              </Td>
                              <Td label={f.colDoctor}>{display(session.doctor_name)}</Td>
                              <Td label={f.colStatus}>
                                <StatusBadge kind="session" status={session.status} />
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Flush>
                  </>
                )}
              </FileSection>
            )}

            {show("appointments") && (
              <FileSection title={f.sections.appointments} testId="file-appointments">
                {ready.appointments.length === 0 ? (
                  <p className="text-sm text-gray-500">{f.noAppointments}</p>
                ) : (
                  <Flush>
                    <Table>
                      <thead>
                        <tr>
                          <Th>{f.colDate}</Th>
                          <Th>{f.colDoctor}</Th>
                          <Th>{f.colReason}</Th>
                          <Th>{f.colStatus}</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {ready.appointments.map((a) => (
                          <tr key={a.name} className="break-inside-avoid">
                            <Td className="whitespace-nowrap">
                              {formatDate(a.appointment_date)}
                              <span className="block text-xs text-gray-500">{formatTime(a.appointment_time)}</span>
                            </Td>
                            <Td label={f.colDoctor}>{display(a.doctor_name)}</Td>
                            <Td label={f.colReason}>{display(a.reason_for_visit)}</Td>
                            <Td label={f.colStatus}>
                              <StatusBadge kind="appointment" status={a.status} />
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Flush>
                )}
              </FileSection>
            )}

            {show("prescriptions") && (
              <FileSection title={f.sections.prescriptions} testId="file-prescriptions">
                {ready.prescriptions.length === 0 ? (
                  <p className="text-sm text-gray-500">{f.noPrescriptions}</p>
                ) : (
                  <Flush>
                    <Table>
                      <thead>
                        <tr>
                          <Th>{f.colDate}</Th>
                          <Th>{f.colDoctor}</Th>
                          <Th>{f.colMedicines}</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {ready.prescriptions.map((rx) => (
                          <tr key={rx.name} className="break-inside-avoid">
                            <Td className="whitespace-nowrap">{formatDate(rx.prescription_date)}</Td>
                            <Td label={f.colDoctor}>{display(rx.doctor_name)}</Td>
                            <Td label={f.colMedicines}>
                              {display(rx.summary)}
                              {rx.notes && <span className="block text-xs text-gray-500">{rx.notes}</span>}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Flush>
                )}
              </FileSection>
            )}

            {show("payments") && (
              <FileSection title={f.sections.payments} testId="file-payments">
                {ready.payments.length === 0 ? (
                  <p className="text-sm text-gray-500">{f.noPayments}</p>
                ) : (
                  <Flush>
                    <Table>
                      <thead>
                        <tr>
                          <Th>{f.colDate}</Th>
                          <Th>{f.colFor}</Th>
                          <Th>{f.colMethod}</Th>
                          <Th className="text-end">{f.colAmount}</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {ready.payments.map((pay) => (
                          <tr key={pay.name} className="break-inside-avoid">
                            <Td className="whitespace-nowrap">{formatDate(pay.payment_date)}</Td>
                            <Td label={f.colFor}>{pay.treatment_type ? label(t.enums.treatmentType, pay.treatment_type) : f.general}</Td>
                            <Td label={f.colMethod}>{label(t.enums.paymentMethod, pay.payment_method)}</Td>
                            <Td label={f.colAmount} className="text-end whitespace-nowrap">{money(pay.amount, pay.currency)}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Flush>
                )}
                <dl className="mt-4 flex flex-wrap justify-end gap-x-8 gap-y-2 text-sm">
                  <div className="flex gap-2">
                    <dt className="text-gray-500">{f.totalPaid}</dt>
                    <dd data-testid="file-total-paid" className="font-semibold text-gray-800">
                      {moneyTotals(sumByCurrency(ready.payments, (pay) => Number(pay.amount) || 0, inCurrency))}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-gray-500">{f.balance}</dt>
                    <dd data-testid="file-balance" className="font-semibold text-gray-800">
                      {moneyTotals(sumByCurrency(ready.plans, (plan) => Number(plan.remaining_amount) || 0, inCurrency))}
                    </dd>
                  </div>
                </dl>
              </FileSection>
            )}

            {show("images") && (
              <FileSection title={f.sections.images} testId="file-images">
                {ready.images.length === 0 ? (
                  <p className="text-sm text-gray-500">{f.noImages}</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {ready.images.map((image) => (
                      <figure key={image.name} className="break-inside-avoid">
                        {isPdf(image) ? (
                          <div className="h-40 rounded-md border border-gray-200 flex items-center justify-center text-xs text-gray-500">{f.pdfFile}</div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element -- an uploaded file of unknown size
                          <img src={fileHref(image.image)} alt="" className="h-40 w-full rounded-md bg-black object-contain" />
                        )}
                        <figcaption className="mt-1 text-xs text-gray-700">
                          <span className="font-medium">{imageTitle(image)}</span>
                          {image.description && <span className="block text-gray-500">{image.description}</span>}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </FileSection>
            )}
          </>
        )}

        <p className="pt-5 text-xs text-gray-500">{f.printedOn(formatDate(todayISO()))}</p>
      </Card>
    </PageContainer>
  );
}

function FileSection({ title, testId, children }: { title?: string; testId?: string; children: ReactNode }) {
  return (
    <section data-testid={testId} className="py-5 border-t border-gray-100 first-of-type:border-t-0">
      {title && <h2 className="text-base font-semibold text-gray-900 mb-3">{title}</h2>}
      {children}
    </section>
  );
}

/** A table that reaches the card's edges, like the other printouts. */
function Flush({ children }: { children: ReactNode }) {
  return <div className="-mx-5 sm:-mx-6 border-t border-gray-100">{children}</div>;
}
