"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCog, Shield, UserPlus, UserSearch } from "lucide-react";
import AddUserDialog from "@/components/AddUserDialog";
import Avatar from "@/components/Avatar";
import RequirePermission from "@/components/Guard";
import {
  Button, Card, ClearFiltersButton, ClickableRow, PageContainer, PageHeader, Pagination,
  SearchInput, SelectInput, StatusBadge, Table, TableError, TableLoading, TableMessage, Td, Th, Toolbar,
} from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useLimit } from "@/components/LimitDialog";
import { useI18n } from "@/context/LanguageContext";
import type { FilterRow } from "@/lib/frappe";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
import { userHref } from "@/lib/links";
import type { User } from "@/lib/types";

export default function UsersPage() {
  return (
    <RequirePermission permission="manage_users">
      <UsersList />
    </RequirePermission>
  );
}

const HIDDEN_USERS: FilterRow = ["name", "not in", ["Administrator", "Guest"]];

function UsersList() {
  const { readOnly } = useSession();
  const router = useRouter();
  const limit = useLimit();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const debounced = useDebounced(search);
  const clearFilters = () => {
    setSearch("");
    setStatus("");
  };

  const list = usePagedList<User>("User", {
    fields: ["name", "full_name", "email", "enabled", "gender", "user_image"],
    filters: [HIDDEN_USERS, ...(status ? [["enabled", "=", status === "active" ? 1 : 0] as FilterRow] : [])],
    orFilters: searchFilters(debounced, ["full_name", "email"]),
    orderBy: "full_name asc",
  });

  return (
    <PageContainer section="system">
      <PageHeader icon={UserCog} section="system"
        title={t.users.title}
        subtitle={t.users.subtitle}
        actions={
          !readOnly && (
            <Button icon={UserPlus} onClick={() => limit.check("users") && setShowAdd(true)}>
              {t.users.addUser}
            </Button>
          )
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder={t.users.searchPlaceholder} />
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40" aria-label={t.users.statusFilter}>
          <option value="">{t.users.allUsers}</option>
          <option value="active">{t.users.active}</option>
          <option value="disabled">{t.users.disabled}</option>
        </SelectInput>
      </Toolbar>

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>{t.users.name}</Th>
              <Th>{t.users.email}</Th>
              <Th>{t.users.status}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.error ? (
              <TableError colSpan={4} message={list.error} onRetry={list.reload} />
            ) : list.initialLoading ? (
              <TableLoading colSpan={4} />
            ) : list.rows.length === 0 ? (
              <TableMessage icon={UserSearch} colSpan={4}>
                {debounced.trim() || status ? (
                  <>
                    {t.users.noneMatch}
                    <ClearFiltersButton onClick={clearFilters} />
                  </>
                ) : (
                  t.users.noneYet
                )}
              </TableMessage>
            ) : (
              list.rows.map((u) => (
                <ClickableRow key={u.name} href={userHref(u.name)} dimmed={list.loading}>
                  <Td>
                    <span className="flex items-center gap-3">
                      <Avatar name={u.full_name || u.name} gender={u.gender} photo={u.user_image} size={36} />
                      <Link href={userHref(u.name)} className="font-medium text-gray-800 hover:text-primary-600">
                        {u.full_name || u.name}
                      </Link>
                    </span>
                  </Td>
                  <Td label={t.users.email}>
                    <span dir="ltr">{u.email}</span>
                  </Td>
                  <Td label={t.users.status}>
                    <StatusBadge kind="user" status={u.enabled ? "Active" : "Disabled"} />
                  </Td>
                  <Td className="text-end">
                    <Link href={userHref(u.name)} className="inline-flex items-center gap-1 text-primary-600 hover:underline text-sm">
                      <Shield size={14} /> {t.users.permissionsLink}
                    </Link>
                  </Td>
                </ClickableRow>
              ))
            )}
          </tbody>
        </Table>
        {!list.error && <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />}
      </Card>

      {limit.dialog}
      {showAdd && <AddUserDialog onClose={() => setShowAdd(false)} onAdded={(user) => router.push(userHref(user.name))} />}
    </PageContainer>
  );
}
