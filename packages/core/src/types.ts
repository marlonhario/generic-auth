export type RoleName = string;

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Comma-separated role names assigned by the Better Auth admin plugin. */
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
}

export interface SessionInfo {
  id: string;
  userId: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Developer-facing sugar only (ADR-0006). Never a security format. */
export type PermissionString = `${string}.${string}`;

export interface StatementMap {
  [resource: string]: readonly string[];
}

export interface RoleDefinition {
  name: RoleName;
  permissions: readonly PermissionString[];
  description?: string;
}

export type RoleConfig =
  | readonly RoleDefinition[]
  | Record<RoleName, readonly PermissionString[]>;

export interface Membership {
  id: string;
  organizationId: string;
  role: RoleName;
}

export interface OrganizationRef {
  id: string;
  name: string;
  slug: string;
}
