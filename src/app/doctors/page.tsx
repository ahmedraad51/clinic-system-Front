"use client";

import { useState } from "react";
import Link from "next/link";
import { BriefcaseMedical, Pencil, Plus } from "lucide-react";
import Avatar from "@/components/Avatar";
import DoctorDialog from "@/components/DoctorDialog";
import RequirePermission from "@/components/Guard";
import {
  Badge, Button, Card, ClearFiltersButton, ClickableRow, PageContainer, PageHeader, Pagination, SearchInput, SelectInput, Table,
  TableError, TableLoading, TableMessage, Td, Th, Toolbar,
} from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useLimit } from "@/components/LimitDialog";
import { useI18n } from "@/context/LanguageContext";
import { label } from "@/i18n";
import { type FilterRow } from "@/lib/frappe";
import { display, formatTime } from "@/lib/format";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
import { doctorHref } from "@/lib/links";
import { type Doctor } from "@/lib/types";

export default function DoctorsPage() {
  return (
    <RequirePermission permission="manage_users">
      <DoctorsList />
    </RequirePermission>
  );
}

/**
 * The clinic's doctors. They appear in the booking and treatment forms and as columns in the calendar
 * while Active is on. A doctor who leaves is switched off, never deleted, so old records keep their name.
 */
function DoctorsList() {
  const { readOnly } = useSession();
  const limit = useLimit();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  // null = closed, "new" = adding, a Doctor = editing that one.
  const [editing, setEditing] = useState<Doctor | "new" | null>(null);
  const debounced = useDebounced(search);
  const clearFilters = () => {
    setSearch("");
    setStatus("");
  };

  const list = usePagedList<Doctor>("Doctor", {
    fields: ["name", "full_name", "specialization", "phone_number", "email", "start_time", "end_time", "is_active", "gender", "photo"],
    filters: status ? [["is_active", "=", status === "active" ? 1 : 0] as FilterRow] : undefined,
    orFilters: searchFilters(debounced, ["full_name", "specialization", "phone_number", "email"]),
    orderBy: "full_name asc",
  });

  return (
    <PageContainer section="system">
      <PageHeader icon={BriefcaseMedical} section="system"
        title={t.doctors.title}
        subtitle={t.doctors.subtitle}
        actions={
          !readOnly && (
            <Button icon={Plus} onClick={() => limit.check("doctors") && setEditing("new")}>
              {t.doctors.addDoctor}
            </Button>
          )
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder={t.doctors.searchPlaceholder} />
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44" aria-label={t.doctors.statusFilter}>
          <option value="">{t.doctors.allDoctors}</option>
          <option value="active">{t.doctors.active}</option>
          <option value="inactive">{t.doctors.notActive}</option>
        </SelectInput>
      </Toolbar>

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>{t.doctors.name}</Th>
              <Th>{t.doctors.specialization}</Th>
              <Th>{t.doctors.phone}</Th>
              <Th>{t.doctors.workingHours}</Th>
              <Th>{t.doctors.status}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.error ? (
              <TableError colSpan={6} message={list.error} onRetry={list.reload} />
            ) : list.initialLoading ? (
              <TableLoading colSpan={6} />
            ) : list.rows.length === 0 ? (
              <TableMessage icon={BriefcaseMedical} colSpan={6}>
                {debounced || status ? (
                  <>
                    {t.doctors.noneMatch}
                    <ClearFiltersButton onClick={clearFilters} />
                  </>
                ) : (
                  t.doctors.noneYet
                )}
              </TableMessage>
            ) : (
              list.rows.map((doctor) => (
                <ClickableRow key={doctor.name} href={doctorHref(doctor.name)} dimmed={list.loading}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={doctor.full_name} gender={doctor.gender} photo={doctor.photo} role="doctor" size={40} />
                      <div className="min-w-0">
                        <Link href={doctorHref(doctor.name)} className="font-medium text-gray-800 hover:text-primary-600">
                          {doctor.full_name}
                        </Link>
                        {doctor.email && <span className="block text-xs text-gray-500" dir="ltr">{doctor.email}</span>}
                      </div>
                    </div>
                  </Td>
                  <Td label={t.doctors.specialization}>{display(label(t.enums.specialization, doctor.specialization))}</Td>
                  <Td label={t.doctors.phone} className="whitespace-nowrap">
                    <span dir="ltr">{display(doctor.phone_number)}</span>
                  </Td>
                  <Td label={t.doctors.workingHours} className="whitespace-nowrap">
                    {doctor.start_time && doctor.end_time
                      ? t.doctors.hours(formatTime(doctor.start_time), formatTime(doctor.end_time))
                      : <span className="text-gray-500">{t.doctors.clinicHours}</span>}
                  </Td>
                  <Td label={t.doctors.status}>
                    <Badge tone={Number(doctor.is_active) === 1 ? "green" : "gray"}>
                      {Number(doctor.is_active) === 1 ? t.doctors.active : t.doctors.notActive}
                    </Badge>
                  </Td>
                  <Td className="text-end">
                    {!readOnly && (
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(doctor)}>
                        {t.doctors.edit}
                      </Button>
                    )}
                  </Td>
                </ClickableRow>
              ))
            )}
          </tbody>
        </Table>
        {!list.error && <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />}
      </Card>

      {limit.dialog}
      {editing && (
        <DoctorDialog
          doctor={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </PageContainer>
  );
}
