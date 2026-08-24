import type { ReactNode } from "react";
import type { PermissionString, RoleName } from "@marlonoirah/auth-core";
import { useAuthState } from "./provider";
import { usePermission, useRole, usePermissions } from "./hooks";

interface GuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback = null }: GuardProps) {
  const { session, loading } = useAuthState();
  if (loading) return <>{fallback}</>;
  return session ? <>{children}</> : <>{fallback}</>;
}

export function RequireRole({
  role,
  children,
  fallback = null,
}: GuardProps & { role: RoleName }) {
  const { loading } = useAuthState();
  const hasRole = useRole(role);
  if (loading) return <>{fallback}</>;
  return hasRole ? <>{children}</> : <>{fallback}</>;
}

export function RequirePermission({
  permission,
  children,
  fallback = null,
}: GuardProps & { permission: PermissionString | string }) {
  const { loading } = useAuthState();
  const allowed = usePermission(permission);
  if (loading) return <>{fallback}</>;
  return allowed ? <>{children}</> : <>{fallback}</>;
}

export function RequirePermissions({
  permissions,
  mode = "all",
  children,
  fallback = null,
}: GuardProps & {
  permissions: ReadonlyArray<PermissionString | string>;
  mode?: "all" | "any";
}) {
  const { loading } = useAuthState();
  const api = usePermissions();
  const allowed =
    mode === "any" ? api.canAny(permissions) : api.canAll(permissions);
  if (loading) return <>{fallback}</>;
  return allowed ? <>{children}</> : <>{fallback}</>;
}
