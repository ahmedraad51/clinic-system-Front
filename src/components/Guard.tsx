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
  // canOpen: a form page stays open while the connection is lost.
  const { canOpen, loading } = useSession();
  if (loading) return <PageLoading />;
  const needed = permission ? (Array.isArray(permission) ? permission : [permission]) : [];
  if (!needed.every((key) => canOpen(key))) return <NoAccess />;
  return <>{children}</>;
}

/**
 * Shows its children only to the platform owner (the "Platform Owner" role; being a System Manager is not enough).
 * The platform's server must refuse its methods to everyone else too.
 */
export function RequirePlatformOwner({ children }: { children: ReactNode }) {
  const { isPlatformOwner, loading } = useSession();
  if (loading) return <PageLoading />;
  if (!isPlatformOwner) return <NoAccess />;
  return <>{children}</>;
}
