"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert,
  Badge,
  Button,
  Card,
  ClearFiltersButton,
  EmptyState,
  Field,
  PageContainer,
  PageHeader,
  PageLoading,
  Pagination,
  SearchInput,
  SelectInput,
  StatusBadge,
  Table,
  TableError,
  TableLoading,
  TableMessage,
  Tabs,
  Td,
  TextArea,
  TextInput,
  Th,
  Toggle,
  Toolbar,
  tooltip,
} from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useSession } from "@/context/SessionContext";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { LANGS, isLang, label, type Messages } from "@/i18n";
import { createDoc, deleteDoc, errorMessage, getList, updateDoc, type FilterRow } from "@/lib/frappe";
import { addDays, formatDate, formatDateTime, formatTime, todayISO } from "@/lib/format";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
import { appointmentHref, patientHref } from "@/lib/links";
import { maskPhone } from "@/lib/phone";
import { PLACEHOLDERS, fillTemplate } from "@/lib/whatsapp";
import {
  WHATSAPP_STATUSES, WHATSAPP_TRIGGERS, type WhatsAppLog, type WhatsAppTemplate, type WhatsAppTrigger,
} from "@/lib/types";

type TabKey = "templates" | "log";

export default function WhatsAppPage() {
  return (
    <RequirePermission permission="manage_users">
      <WhatsApp />
    </RequirePermission>
  );
}

function WhatsApp() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const [tab, setTab] = useState<TabKey>("templates");

  return (
    <PageContainer section="whatsapp">
      <PageHeader icon={MessageCircle} section="whatsapp" title={t.whatsapp.title} subtitle={t.whatsapp.subtitle} />
      {settings.enable_whatsapp === 0 && (
        <Alert tone="yellow" title={t.whatsapp.offTitle}>
          {t.whatsapp.offTextBefore}{" "}
          <Link href="/settings" className="underline">
            {t.whatsapp.offTextLink}
          </Link>
          {t.whatsapp.offTextAfter}
        </Alert>
      )}
      <Tabs
        tabs={[
          { key: "templates", label: t.whatsapp.tabs.templates },
          { key: "log", label: t.whatsapp.tabs.log },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "templates" ? <Templates /> : <MessageLog />}
    </PageContainer>
  );
}

/* ------------------------------------------------------------ templates -- */

/** "Arabic", "English" or "Any language" for a template's language field. */
function languageName(language: string | undefined, t: Messages): string {
  return isLang(language) ? t.enums.language[language] : t.whatsapp.anyLanguage;
}

function Templates() {
  const { readOnly } = useSession();
  const { t } = useI18n();
  const [templates, setTemplates] = useState<WhatsAppTemplate[] | null>(null);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<{ open: boolean; template: WhatsAppTemplate | null }>({ open: false, template: null });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<WhatsAppTemplate>(
          "WhatsApp Template",
          ["name", "template_name", "trigger", "message", "is_active", "language"],
          { orderBy: "template_name asc", limit: 0 },
        );
        if (!cancelled) setTemplates(rows);
      } catch (err) {
        console.error(err);
        if (!cancelled) setTemplates([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [version]);

  const close = () => setEditing({ open: false, template: null });

  return (
    <>
      {!readOnly && (
        <div className="flex justify-end">
          <Button icon={Plus} onClick={() => setEditing({ open: true, template: null })}>
            {t.whatsapp.newTemplate}
          </Button>
        </div>
      )}

      {templates === null ? (
        <PageLoading />
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState icon={MessageCircle} title={t.whatsapp.noTemplates} text={t.whatsapp.noTemplatesText} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card key={template.name}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800" dir="auto">{template.template_name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <StatusBadge kind="trigger" status={template.trigger} />
                    {Number(template.is_active) === 1 ? <Badge tone="green">{t.whatsapp.active}</Badge> : <Badge>{t.whatsapp.off}</Badge>}
                    <Badge tone="blue">{languageName(template.language, t)}</Badge>
                  </div>
                </div>
                {!readOnly && (
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing({ open: true, template })}>
                    {t.common.edit}
                  </Button>
                )}
              </div>
              {/* dir="auto": an Arabic message reads right to left on an English screen, and the other way round. */}
              <p className="text-sm text-gray-600 mt-4 whitespace-pre-line line-clamp-4 text-start" dir="auto">{template.message}</p>
            </Card>
          ))}
        </div>
      )}

      {editing.open && (
        <TemplateModal
          template={editing.template}
          onClose={close}
          onSaved={() => {
            close();
            setVersion((v) => v + 1);
          }}
        />
      )}
    </>
  );
}

function TemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: WhatsAppTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { clinicName } = useSettings();
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [form, setForm] = useState({
    template_name: template?.template_name ?? "",
    trigger: template?.trigger ?? ("24 Hours Before" as WhatsAppTrigger),
    message: template?.message ?? "",
    is_active: template ? Number(template.is_active) === 1 : true,
    // A new template is most likely written in the screen's language. Empty: any language.
    language: template ? template.language ?? "" : lang,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");

  const sample: Record<string, string> = {
    patient_name: t.whatsapp.samplePatient,
    appointment_date: formatDate(addDays(todayISO(), 1)),
    appointment_time: formatTime("10:00"),
    doctor_name: t.whatsapp.sampleDoctor,
    clinic_name: clinicName,
  };
  const preview = fillTemplate(form.message, sample);

  const insertPlaceholder = (key: string) => {
    const token = `{{ ${key} }}`;
    const box = messageRef.current;
    const start = box?.selectionStart ?? form.message.length;
    const end = box?.selectionEnd ?? form.message.length;
    const message = form.message.slice(0, start) + token + form.message.slice(end);
    setForm({ ...form, message });
    requestAnimationFrame(() => {
      box?.focus();
      box?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = { ...form, is_active: form.is_active ? 1 : 0, language: form.language || null };
    try {
      if (template) {
        await updateDoc("WhatsApp Template", template.name, payload);
      } else {
        await createDoc("WhatsApp Template", payload);
      }
      toast.success(t.whatsapp.saved);
      onSaved();
    } catch (err) {
      setError(errorMessage(err, t.whatsapp.saveFailed));
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteDoc("WhatsApp Template", template.name);
      toast.success(t.whatsapp.deleted);
      onSaved();
    } catch (err) {
      setError(errorMessage(err, t.whatsapp.deleteFailed));
      setDeleting(false);
    }
  };

  return (
    <Modal open wide title={template ? t.whatsapp.editTemplate : t.whatsapp.newTemplate} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t.whatsapp.templateName} required>
            <TextInput value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })} required dir="auto" />
          </Field>
          <Field label={t.whatsapp.whenToSend} required hint={label(t.whatsapp.triggerHelp, form.trigger)}>
            <SelectInput value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value as WhatsAppTrigger })}>
              {WHATSAPP_TRIGGERS.map((trigger) => (
                <option key={trigger} value={trigger}>
                  {label(t.enums.whatsappTrigger, trigger)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t.whatsapp.language} hint={t.whatsapp.languageHint} className="sm:col-span-2">
            <SelectInput value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              <option value="">{t.whatsapp.anyLanguage}</option>
              {LANGS.map((code) => (
                <option key={code} value={code}>
                  {t.enums.language[code]}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <div>
          <Field label={t.whatsapp.message} required>
            <TextArea
              ref={messageRef}
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
              dir="auto"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-xs text-gray-500 me-1">{t.whatsapp.insert}</span>
            {PLACEHOLDERS.map((key) => (
              <button
                key={key}
                type="button"
                dir="ltr"
                {...tooltip(t.whatsapp.placeholderHelp[key])}
                onClick={() => insertPlaceholder(key)}
                className="px-2 py-1 rounded-lg bg-gray-100 text-xs font-mono text-gray-700 hover:bg-primary-50 hover:text-primary-700"
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-1.5">{t.whatsapp.preview}</p>
          <div
            dir={preview ? "auto" : undefined}
            className="rounded-2xl rounded-ss-sm bg-green-50 border border-green-100 px-4 py-3 text-sm text-gray-800 whitespace-pre-line min-h-[3rem] text-start"
          >
            {preview || <span className="text-gray-500">{t.whatsapp.previewEmpty}</span>}
          </div>
        </div>

        <Toggle
          checked={form.is_active}
          onChange={(value) => setForm({ ...form, is_active: value })}
          label={t.whatsapp.active}
          description={t.whatsapp.activeHint}
        />

        {error && <Alert tone="red">{error}</Alert>}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="submit" loading={saving} disabled={deleting}>
            {t.whatsapp.saveTemplate}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving || deleting}>
            {t.common.cancel}
          </Button>
          {template && (
            <Button
              variant="ghost"
              icon={Trash2}
              onClick={handleDelete}
              loading={deleting}
              disabled={saving}
              className="ms-auto text-red-600 hover:bg-red-50"
            >
              {confirmingDelete ? t.whatsapp.clickAgain : t.common.delete}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------- message log -- */

function MessageLog() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const debounced = useDebounced(search);
  const clearFilters = () => {
    setSearch("");
    setStatus("");
  };

  const list = usePagedList<WhatsAppLog>("WhatsApp Log", {
    fields: ["name", "patient", "patient_name", "appointment", "phone_number", "status", "sent_at", "message", "error_message"],
    filters: status ? [["status", "=", status] as FilterRow] : undefined,
    orFilters: searchFilters(debounced, ["patient_name", "phone_number", "message"]),
    orderBy: "sent_at desc",
  });

  return (
    <>
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder={t.whatsapp.log.searchPlaceholder} />
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40" aria-label={t.common.status}>
          <option value="">{t.whatsapp.log.allStatuses}</option>
          {WHATSAPP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(t.enums.whatsappStatus, s)}
            </option>
          ))}
        </SelectInput>
      </Toolbar>

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>{t.whatsapp.log.sent}</Th>
              <Th>{t.common.patient}</Th>
              <Th>{t.common.status}</Th>
              <Th>{t.whatsapp.log.message}</Th>
            </tr>
          </thead>
          <tbody>
            {list.error ? (
              <TableError colSpan={4} message={list.error} onRetry={list.reload} />
            ) : list.initialLoading ? (
              <TableLoading colSpan={4} />
            ) : list.rows.length === 0 ? (
              <TableMessage icon={MessageCircle} colSpan={4}>
                {debounced.trim() || status ? (
                  <>
                    {t.whatsapp.log.noMatch}
                    <ClearFiltersButton onClick={clearFilters} />
                  </>
                ) : (
                  t.whatsapp.log.none
                )}
              </TableMessage>
            ) : (
              list.rows.map((log) => (
                <tr key={log.name} className={list.loading ? "opacity-60" : "hover:bg-gray-50"}>
                  <Td className="whitespace-nowrap">
                    {formatDateTime(log.sent_at)}
                    {log.appointment && (
                      <Link href={appointmentHref(log.appointment)} className="block text-xs text-primary-600 hover:underline">
                        <span dir="ltr">{log.appointment}</span>
                      </Link>
                    )}
                  </Td>
                  <Td label={t.common.patient}>
                    {log.patient ? (
                      <Link href={patientHref(log.patient)} className="text-gray-800 hover:text-primary-600">
                        {log.patient_name || log.patient}
                      </Link>
                    ) : (
                      t.common.dash
                    )}
                    {/* The log lists many patients' numbers; the full number is on the patient's page. */}
                    {log.phone_number && (
                      <span className="block text-xs text-gray-500">
                        <span dir="ltr">{maskPhone(log.phone_number)}</span>
                      </span>
                    )}
                  </Td>
                  <Td label={t.common.status}>
                    <StatusBadge kind="whatsapp" status={log.status} />
                  </Td>
                  <Td label={t.whatsapp.log.message} className="max-w-md">
                    <p className="line-clamp-2 text-start" dir="auto">{log.message || t.common.dash}</p>
                    {log.error_message && <p className="text-xs text-red-600 mt-1">{log.error_message}</p>}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {!list.error && <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />}
      </Card>
    </>
  );
}
