import type { Membership, OrganizationRef, PermissionString, RoleName, SessionInfo, User } from "./types";

/**
 * Authorization context resolved per request by the server package.
 * `can` delegates to Better Auth (ADR-0001/0006) — server-side only.
 */
export interface AuthContext {
  user: User;
  session: SessionInfo;
  roles: RoleName[];
  can: (permission: PermissionString) => Promise<boolean>;
  hasRole: (role: RoleName) => boolean;
  hasAnyRole: (roles: readonly RoleName[]) => boolean;
  organization?: OrganizationRef;
  membership?: Membership;
}
