"use client";

import { useState } from "react";
import Link from "next/link";
import { Stethoscope, ClipboardList, Plus } from "lucide-react";
import { PatientLink } from "@/components/Avatar";
import RequirePermission from "@/components/Guard";
import {
  Card, ClearFiltersButton, ClickableRow, LinkButton, PageContainer, PageHeader, Pagination, SearchInput,
  SelectInput, StatusBadge, Table, TableError, TableLoading, TableMessage, Td, Th, Toolbar,
} from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { label } from "@/i18n";
import type { FilterRow } from "@/lib/frappe";
import { display } from "@/lib/format";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
import { treatmentHref } from "@/lib/links";
import { TREATMENT_STATUSES, TREATMENT_TYPES, type TreatmentPlan } from "@/lib/types";

export default function TreatmentsPage() {
  return (
    <RequirePermission permission="view_treatments">
      <TreatmentsList />
    </RequirePermission>
  );
}

function TreatmentsList() {
  const { t } = useI18n();
  const { can } = useSession();
  const { money } = useSettings();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const debounced = useDebounced(search);

  const filters: FilterRow[] = [
    ...(status ? [["status", "=", status] as FilterRow] : []),
    ...(type ? [["treatment_type", "=", type] as FilterRow] : []),
  ];
  const list = usePagedList<TreatmentPlan>("Treatment Plan", {
    fields: [
      "name", "patient", "patient_name", "doctor_name", "treatment_type", "tooth_number",
      "status", "currency", "total_cost", "remaining_amount",
    ],
    filters: filters.length ? filters : undefined,
    orFilters: treatmentSearch(debounced, (type) => label(t.enums.treatmentType, type)),
    orderBy: "name desc",
  });
  const filtered = Boolean(debounced.trim() || status || type);
  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setType("");
  };

  return (
    <PageContainer section="treatments">
      <PageHeader icon={Stethoscope} section="treatments"
        title={t.treatments.title}
        subtitle={t.treatments.subtitle}
        actions={
          can("add_treatments") && (
            <LinkButton href="/treatments/new" icon={Plus}>
              {t.treatments.newTreatment}
            </LinkButton>
          )
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder={t.treatments.searchPlaceholder} />
        <SelectInput value={type} onChange={(e) => setType(e.target.value)} className="sm:w-44" aria-label={t.treatments.typeFilter}>
          <option value="">{t.treatments.allTypes}</option>
          {TREATMENT_TYPES.map((value) => (
            <option key={value} value={value}>
              {label(t.enums.treatmentType, value)}
            </option>
          ))}
        </SelectInput>
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40" aria-label={t.common.status}>
          <option value="">{t.treatments.allStatuses}</option>
          {TREATMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(t.enums.treatmentStatus, s)}
            </option>
          ))}
        </SelectInput>
      </Toolbar>

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>{t.treatments.treatment}</Th>
              <Th>{t.common.patient}</Th>
              <Th>{t.treatments.tooth}</Th>
              <Th>{t.common.doctor}</Th>
              <Th>{t.common.status}</Th>
              <Th className="text-end">{t.treatments.cost}</Th>
              <Th className="text-end">{t.treatments.remaining}</Th>
            </tr>
          </thead>
          <tbody>
            {list.error ? (
              <TableError colSpan={7} message={list.error} onRetry={list.reload} />
            ) : list.initialLoading ? (
              <TableLoading colSpan={7} />
            ) : list.rows.length === 0 ? (
              <TableMessage icon={ClipboardList} colSpan={7}>
                {filtered ? (
                  <>
                    {t.treatments.noMatch}
                    <ClearFiltersButton onClick={clearFilters} />
                  </>
                ) : (
                  t.treatments.empty
                )}
              </TableMessage>
            ) : (
              list.rows.map((plan) => (
                <ClickableRow key={plan.name} href={treatmentHref(plan.name)} dimmed={list.loading}>
                  <Td>
                    <Link href={treatmentHref(plan.name)} className="font-medium text-gray-800 hover:text-primary-600">
                      {label(t.enums.treatmentType, plan.treatment_type)}
                    </Link>
                    <span className="block text-xs text-gray-500">
                      <span dir="ltr">{plan.name}</span>
                    </span>
                  </Td>
                  <Td label={t.common.patient}>
                    <PatientLink id={plan.patient} name={plan.patient_name} />
                  </Td>
                  <Td label={t.treatments.tooth}>{display(plan.tooth_number)}</Td>
                  <Td label={t.common.doctor}>{display(plan.doctor_name)}</Td>
                  <Td label={t.common.status}>
                    <StatusBadge kind="treatment" status={plan.status} />
                  </Td>
                  <Td label={t.treatments.cost} className="text-end whitespace-nowrap">{money(plan.total_cost, plan.currency)}</Td>
                  <Td label={t.treatments.remaining} className="text-end whitespace-nowrap">
                    <span className={Number(plan.remaining_amount) > 0 ? "font-medium text-red-600" : "text-gray-500"}>
                      {money(plan.remaining_amount, plan.currency)}
                    </span>
                  </Td>
                </ClickableRow>
              ))
            )}
          </tbody>
        </Table>
        {!list.error && <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />}
      </Card>
    </PageContainer>
  );
}

/**
 * The search: patient, treatment type, tooth or plan ID. Types are saved in English, so a word typed from the
 * translated name on screen ("حشوة") also finds the plans of that type ("Filling").
 */
function treatmentSearch(text: string, typeLabel: (type: string) => string): FilterRow[] | undefined {
  const rows = searchFilters(text, ["patient_name", "treatment_type", "tooth_number", "name"]);
  const needle = text.trim().toLowerCase();
  if (!rows || !needle) return rows;
  const types = TREATMENT_TYPES.filter((type) => {
    const shown = typeLabel(type);
    return shown !== type && shown.toLowerCase().includes(needle);
  });
  return types.length ? [...rows, ["treatment_type", "in", [...types]]] : rows;
}
