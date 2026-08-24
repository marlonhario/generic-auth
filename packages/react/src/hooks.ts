import { useMemo } from "react";
import type { PermissionString, RoleName, User } from "@marlonoirah/auth-core";
import { useAuthState } from "./provider";

export function parseUserRoles(user: User): RoleName[] {
  if (!user.role) return [];
  return user.role
    .split(",")
    .map((role) => role.trim())
    .filter((role) => role.length > 0);
}

export function useSession() {
  const { session, loading } = useAuthState();
  return {
    user: session?.user ?? null,
    session: session?.session ?? null,
    loading,
  };
}

export { useAuthState as useAuthContext };

export function useRoles(): RoleName[] {
  const { session } = useAuthState();
  return useMemo(
    () => (session?.user ? parseUserRoles(session.user) : []),
    [session],
  );
}

export function useRole(role: RoleName): boolean {
  return useRoles().includes(role);
}

function resolvePermissions(
  roles: readonly RoleName[],
  roleMap:
    | Record<RoleName, readonly PermissionString[]>
    | undefined,
): Set<PermissionString> {
  const granted = new Set<PermissionString>();
  for (const role of roles) {
    for (const permission of roleMap?.[role] ?? []) {
      granted.add(permission);
    }
  }
  return granted;
}

export interface PermissionsApi {
  can: (permission: PermissionString | string) => boolean;
  canAny: (permissions: ReadonlyArray<PermissionString | string>) => boolean;
  canAll: (permissions: ReadonlyArray<PermissionString | string>) => boolean;
}

export function usePermissions(): PermissionsApi {
  const roles = useRoles();
  const { roleMap } = useAuthState();
  return useMemo(() => {
    const granted = resolvePermissions(roles, roleMap);
    return {
      can: (permission) => granted.has(permission as PermissionString),
      canAny: (permissions) =>
        permissions.some((permission) => granted.has(permission as PermissionString)),
      canAll: (permissions) =>
        permissions.every((permission) => granted.has(permission as PermissionString)),
    };
  }, [roles, roleMap]);
}

export function usePermission(permission: PermissionString | string): boolean {
  return usePermissions().can(permission);
}
