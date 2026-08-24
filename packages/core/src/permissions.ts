import type { PermissionString, StatementMap } from "./types";

/**
 * Parses "resource.action" sugar into its parts (ADR-0006).
 * Throws on malformed input — this is a translation boundary, not a security check.
 */
export function parsePermissionString(permission: PermissionString): {
  resource: string;
  action: string;
} {
  const segments = permission.split(".");
  if (
    segments.length < 2 ||
    segments.some((segment) => segment.length === 0)
  ) {
    throw new Error(
      `Invalid permission "${permission}": expected non-empty "resource.action"`,
    );
  }
  return {
    resource: segments[0]!,
    action: segments.slice(1).join("."),
  };
}

export function toStatement(permission: PermissionString): StatementMap {
  const { resource, action } = parsePermissionString(permission);
  return { [resource]: [action] };
}

export function toStatements(
  permissions: readonly PermissionString[],
): StatementMap[] {
  return permissions.map((permission) => toStatement(permission));
}
