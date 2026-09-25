"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert, Card, ClickableRow, LinkButton, PageContainer, PageHeader, Pagination,
  SearchInput, SelectInput, Table, TableMessage, Td, Th, Toolbar,
} from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
import { display } from "@/lib/format";
import { patientHref } from "@/lib/links";
import { GENDERS, type Patient } from "@/lib/types";

export default function PatientsPage() {
  return (
    <RequirePermission permission="view_patients">
      <PatientsList />
    </RequirePermission>
  );
}

function PatientsList() {
  const { can } = useSession();
  const { money } = useSettings();
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const debounced = useDebounced(search);
  const showBalance = can("view_payments");

  const list = usePagedList<Patient>("Patient", {
    fields: ["name", "full_name", "phone_number", "gender", "age", "email", "total_remaining"],
    filters: gender ? [["gender", "=", gender]] : undefined,
    orFilters: searchFilters(debounced, ["full_name", "phone_number", "secondary_phone", "name"]),
    orderBy: "full_name asc",
  });
  const columns = showBalance ? 5 : 4;
  const filtered = Boolean(debounced.trim() || gender);

  return (
    <PageContainer>
      <PageHeader
        title="Patients"
        subtitle="Search by name, phone number or patient ID."
        actions={
          can("add_patients") && (
            <LinkButton href="/patients/new" icon={UserPlus}>
              Add Patient
            </LinkButton>
          )
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search patients..." />
        <SelectInput value={gender} onChange={(e) => setGender(e.target.value)} className="sm:w-44" aria-label="Gender">
          <option value="">All genders</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </SelectInput>
      </Toolbar>

      {list.error && <Alert tone="red">{list.error}</Alert>}

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Gender</Th>
              <Th>Age</Th>
              {showBalance && <Th className="text-end">Balance</Th>}
            </tr>
          </thead>
          <tbody>
            {list.initialLoading ? (
              <TableMessage colSpan={columns}>Loading...</TableMessage>
            ) : list.rows.length === 0 ? (
              <TableMessage colSpan={columns}>
                {filtered ? "No patients match your search." : "No patients yet."}
              </TableMessage>
            ) : (
              list.rows.map((patient) => (
                <ClickableRow key={patient.name} href={patientHref(patient.name)} dimmed={list.loading}>
                  <Td>
                    <Link href={patientHref(patient.name)} className="font-medium text-gray-800 hover:text-blue-600">
                      {patient.full_name}
                    </Link>
                    <span className="block text-xs text-gray-400">{patient.name}</span>
                  </Td>
                  <Td className="whitespace-nowrap">{display(patient.phone_number)}</Td>
                  <Td>{display(patient.gender)}</Td>
                  <Td>{patient.age ? patient.age : "—"}</Td>
                  {showBalance && (
                    <Td className="text-end whitespace-nowrap">
                      {Number(patient.total_remaining) > 0 ? (
                        <span className="font-medium text-red-600">{money(patient.total_remaining)}</span>
                      ) : (
                        <span className="text-gray-400">{money(0)}</span>
                      )}
                    </Td>
                  )}
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
