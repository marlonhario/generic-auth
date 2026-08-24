import { createAuthClient } from "@marlonoirah/auth-client";
import type { PermissionString, RoleName } from "@marlonoirah/auth-core";
import { roles } from "./roles";

export function createClient() {
  return createAuthClient({
    baseURL: "http://localhost:3000",
    organizationEnabled: false,
  });
}

/**
 * Same RoleConfig as the server — this powers client-side permission UX only.
 * The server remains the security boundary.
 */
export const clientRoles: Record<RoleName, readonly PermissionString[]> =
  Object.fromEntries(roles.map((role) => [role.name, role.permissions]));
