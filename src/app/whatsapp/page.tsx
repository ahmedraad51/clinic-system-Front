"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert, Badge, Button, Card, EmptyState, Field, PageContainer, PageHeader, PageLoading, Pagination,
  SearchInput, SelectInput, StatusBadge, Table, TableLoading, TableMessage, Tabs, Td, TextArea, TextInput, Th, Toggle, Toolbar,
} from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { createDoc, deleteDoc, errorMessage, getList, updateDoc, type FilterRow } from "@/lib/frappe";
import { addDays, formatDate, formatDateTime, todayISO } from "@/lib/format";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
import { appointmentHref, patientHref } from "@/lib/links";
import {
  WHATSAPP_STATUSES, WHATSAPP_TRIGGERS, type WhatsAppLog, type WhatsAppTemplate, type WhatsAppTrigger,
} from "@/lib/types";

/** The values a template can use. The backend fills them in when it sends a message. */
const PLACEHOLDERS = ["patient_name", "appointment_date", "appointment_time", "doctor_name", "clinic_name"] as const;

const TRIGGER_HELP: Record<WhatsAppTrigger, string> = {
  "24 Hours Before": "Sent automatically about a day before the appointment.",
  "2 Hours Before": "Sent automatically about two hours before the appointment.",
  Manual: "Never sent automatically.",
};

type TabKey = "templates" | "log";

export default function WhatsAppPage() {
  return (
    <RequirePermission permission="manage_users">
      <WhatsApp />
    </RequirePermission>
  );
}

function WhatsApp() {
  const { settings } = useSettings();
  const [tab, setTab] = useState<TabKey>("templates");

  return (
    <PageContainer>
      <PageHeader title="WhatsApp" subtitle="Reminder messages for appointments, and a log of every message sent." />
      {settings.enable_whatsapp === 0 && (
        <Alert tone="yellow" title="WhatsApp reminders are turned off">
          The templates are kept, but no messages are sent. Turn reminders on under{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>
          .
        </Alert>
      )}
      <Tabs
        tabs={[
          { key: "templates", label: "Templates" },
          { key: "log", label: "Message Log" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "templates" ? <Templates /> : <MessageLog />}
    </PageContainer>
  );
}

/* ------------------------------------------------------------ templates -- */

function Templates() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[] | null>(null);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<{ open: boolean; template: WhatsAppTemplate | null }>({ open: false, template: null });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<WhatsAppTemplate>(
          "WhatsApp Template",
          ["name", "template_name", "trigger", "message", "is_active"],
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
      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => setEditing({ open: true, template: null })}>
          New Template
        </Button>
      </div>

      {templates === null ? (
        <PageLoading />
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState icon={MessageCircle} title="No templates yet" text="Add a template to start sending reminders." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card key={template.name}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800">{template.template_name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <StatusBadge kind="trigger" status={template.trigger} />
                    {Number(template.is_active) === 1 ? <Badge tone="green">Active</Badge> : <Badge>Off</Badge>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing({ open: true, template })}>
                  Edit
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-4 whitespace-pre-line line-clamp-4">{template.message}</p>
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
  const toast = useToast();
  const { clinicName } = useSettings();
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [form, setForm] = useState({
    template_name: template?.template_name ?? "",
    trigger: template?.trigger ?? ("24 Hours Before" as WhatsAppTrigger),
    message: template?.message ?? "",
    is_active: template ? Number(template.is_active) === 1 : true,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");

  const sample: Record<string, string> = {
    patient_name: "Nadia Samir",
    appointment_date: formatDate(addDays(todayISO(), 1)),
    appointment_time: "10:00 AM",
    doctor_name: "Dr. Sarah Mansour",
    clinic_name: clinicName,
  };
  const preview = form.message.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => sample[key] ?? match);

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
    const payload = { ...form, is_active: form.is_active ? 1 : 0 };
    try {
      if (template) {
        await updateDoc("WhatsApp Template", template.name, payload);
      } else {
        await createDoc("WhatsApp Template", payload);
      }
      toast.success("Template saved.");
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Could not save the template."));
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
      toast.success("Template deleted.");
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Could not delete the template."));
      setDeleting(false);
    }
  };

  return (
    <Modal open wide title={template ? "Edit Template" : "New Template"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Template Name" required>
            <TextInput value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })} required />
          </Field>
          <Field label="When to Send" required hint={TRIGGER_HELP[form.trigger]}>
            <SelectInput value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value as WhatsAppTrigger })}>
              {WHATSAPP_TRIGGERS.map((trigger) => (
                <option key={trigger} value={trigger}>
                  {trigger}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <div>
          <Field label="Message" required>
            <TextArea
              ref={messageRef}
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
            />
          </Field>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-xs text-gray-500 me-1">Insert:</span>
            {PLACEHOLDERS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => insertPlaceholder(key)}
                className="px-2 py-1 rounded-lg bg-gray-100 text-xs font-mono text-gray-700 hover:bg-primary-50 hover:text-primary-700"
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-1.5">Preview</p>
          <div className="rounded-2xl rounded-ss-sm bg-green-50 border border-green-100 px-4 py-3 text-sm text-gray-800 whitespace-pre-line min-h-[3rem]">
            {preview || <span className="text-gray-500">The message will show here.</span>}
          </div>
        </div>

        <Toggle
          checked={form.is_active}
          onChange={(value) => setForm({ ...form, is_active: value })}
          label="Active"
          description="Only active templates are used for reminders."
        />

        {error && <Alert tone="red">{error}</Alert>}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="submit" loading={saving} disabled={deleting}>
            Save Template
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving || deleting}>
            Cancel
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
              {confirmingDelete ? "Click again to delete" : "Delete"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------- message log -- */

function MessageLog() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const debounced = useDebounced(search);

  const list = usePagedList<WhatsAppLog>("WhatsApp Log", {
    fields: ["name", "patient", "patient_name", "appointment", "phone_number", "status", "sent_at", "message", "error_message"],
    filters: status ? [["status", "=", status] as FilterRow] : undefined,
    orFilters: searchFilters(debounced, ["patient_name", "phone_number", "message"]),
    orderBy: "sent_at desc",
  });

  return (
    <>
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by patient, phone or text..." />
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40" aria-label="Status">
          <option value="">All statuses</option>
          {WHATSAPP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectInput>
      </Toolbar>

      {list.error && <Alert tone="red">{list.error}</Alert>}

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>Sent</Th>
              <Th>Patient</Th>
              <Th>Status</Th>
              <Th>Message</Th>
            </tr>
          </thead>
          <tbody>
            {list.initialLoading ? (
              <TableLoading colSpan={4} />
            ) : list.rows.length === 0 ? (
              <TableMessage icon={MessageCircle} colSpan={4}>No messages found.</TableMessage>
            ) : (
              list.rows.map((log) => (
                <tr key={log.name} className={list.loading ? "opacity-60" : "hover:bg-gray-50"}>
                  <Td className="whitespace-nowrap">
                    {formatDateTime(log.sent_at)}
                    {log.appointment && (
                      <Link href={appointmentHref(log.appointment)} className="block text-xs text-primary-600 hover:underline">
                        {log.appointment}
                      </Link>
                    )}
                  </Td>
                  <Td label="Patient">
                    {log.patient ? (
                      <Link href={patientHref(log.patient)} className="text-gray-800 hover:text-primary-600">
                        {log.patient_name || log.patient}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {log.phone_number && <span className="block text-xs text-gray-500">{log.phone_number}</span>}
                  </Td>
                  <Td label="Status">
                    <StatusBadge kind="whatsapp" status={log.status} />
                  </Td>
                  <Td label="Message" className="max-w-md">
                    <p className="line-clamp-2">{log.message || "—"}</p>
                    {log.error_message && <p className="text-xs text-red-600 mt-1">{log.error_message}</p>}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />
      </Card>
    </>
  );
}
