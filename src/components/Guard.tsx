"use client";

import type { ReactNode } from "react";
import { useSession } from "@/context/SessionContext";
import { NoAccess, PageLoading } from "@/components/ui";
import type { PermissionKey } from "@/lib/types";

/**
 * Shows its children only when the current user has every listed permission.
 * Wrap each page's content in this. It hides screens; the backend must still refuse the data.
 */
export default function RequirePermission({
  permission,
  children,
}: {
  permission?: PermissionKey | PermissionKey[];
  children: ReactNode;
}) {
  const { can, loading } = useSession();
  if (loading) return <PageLoading />;
  const needed = permission ? (Array.isArray(permission) ? permission : [permission]) : [];
  if (!needed.every((key) => can(key))) return <NoAccess />;
  return <>{children}</>;
}
