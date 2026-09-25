"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert, Card, ClickableRow, LinkButton, PageContainer, PageHeader, Pagination,
  SearchInput, SelectInput, StatusBadge, Table, TableMessage, Td, Th, Toolbar,
} from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import type { FilterRow } from "@/lib/frappe";
import { display } from "@/lib/format";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
import { patientHref, treatmentHref } from "@/lib/links";
import { TREATMENT_STATUSES, TREATMENT_TYPES, type TreatmentPlan } from "@/lib/types";

export default function TreatmentsPage() {
  return (
    <RequirePermission permission="view_treatments">
      <TreatmentsList />
    </RequirePermission>
  );
}

function TreatmentsList() {
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
      "status", "total_cost", "remaining_amount",
    ],
    filters: filters.length ? filters : undefined,
    orFilters: searchFilters(debounced, ["patient_name", "treatment_type", "tooth_number", "name"]),
    orderBy: "name desc",
  });
  const filtered = Boolean(debounced.trim() || status || type);

  return (
    <PageContainer>
      <PageHeader
        title="Treatment Plans"
        subtitle="Planned and ongoing work for each patient, with what is still to pay."
        actions={
          can("add_treatments") && (
            <LinkButton href="/treatments/new" icon={Plus}>
              New Treatment
            </LinkButton>
          )
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by patient, treatment or tooth..." />
        <SelectInput value={type} onChange={(e) => setType(e.target.value)} className="sm:w-44" aria-label="Treatment type">
          <option value="">All treatments</option>
          {TREATMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectInput>
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40" aria-label="Status">
          <option value="">All statuses</option>
          {TREATMENT_STATUSES.map((s) => (
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
              <Th>Treatment</Th>
              <Th>Patient</Th>
              <Th>Tooth</Th>
              <Th>Doctor</Th>
              <Th>Status</Th>
              <Th className="text-end">Cost</Th>
              <Th className="text-end">Remaining</Th>
            </tr>
          </thead>
          <tbody>
            {list.initialLoading ? (
              <TableMessage colSpan={7}>Loading...</TableMessage>
            ) : list.rows.length === 0 ? (
              <TableMessage colSpan={7}>
                {filtered ? "No treatment plans match these filters." : "No treatment plans yet."}
              </TableMessage>
            ) : (
              list.rows.map((plan) => (
                <ClickableRow key={plan.name} href={treatmentHref(plan.name)} dimmed={list.loading}>
                  <Td>
                    <Link href={treatmentHref(plan.name)} className="font-medium text-gray-800 hover:text-blue-600">
                      {plan.treatment_type}
                    </Link>
                    <span className="block text-xs text-gray-400">{plan.name}</span>
                  </Td>
                  <Td>
                    <Link href={patientHref(plan.patient)} className="text-gray-700 hover:text-blue-600">
                      {plan.patient_name || plan.patient}
                    </Link>
                  </Td>
                  <Td>{display(plan.tooth_number)}</Td>
                  <Td>{display(plan.doctor_name)}</Td>
                  <Td>
                    <StatusBadge kind="treatment" status={plan.status} />
                  </Td>
                  <Td className="text-end whitespace-nowrap">{money(plan.total_cost)}</Td>
                  <Td className="text-end whitespace-nowrap">
                    <span className={Number(plan.remaining_amount) > 0 ? "font-medium text-red-600" : "text-gray-400"}>
                      {money(plan.remaining_amount)}
                    </span>
                  </Td>
                </ClickableRow>
              ))
            )}
          </tbody>
        </Table>
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />
      </Card>
    </PageContainer>
  );
}
