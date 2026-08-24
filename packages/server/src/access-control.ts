import { createAccessControl } from "better-auth/plugins/access";
import type {
  PermissionString,
  RoleConfig,
  RoleDefinition,
  StatementMap,
} from "@marlonoirah/auth-core";
import { parsePermissionString } from "@marlonoirah/auth-core";

export function normalizeRoleConfig(config: RoleConfig): RoleDefinition[] {
  if (Array.isArray(config)) {
    return config;
  }
  return Object.entries(config).map(([name, permissions]) => ({
    name,
    permissions,
  }));
}

function groupByResource(permissions: readonly PermissionString[]): StatementMap {
  const grouped: Record<string, Set<string>> = {};
  for (const permission of permissions) {
    const { resource, action } = parsePermissionString(permission);
    (grouped[resource] ??= new Set()).add(action);
  }
  return Object.fromEntries(
    Object.entries(grouped).map(([resource, actions]) => [resource, [...actions]]),
  );
}

export function buildAccessControl(config: RoleConfig) {
  const definitions = normalizeRoleConfig(config);

  const unionPermissions = definitions.flatMap((def) => def.permissions);
  const statements = groupByResource(unionPermissions);
  const ac = createAccessControl(statements);

  const roles: Record<string, ReturnType<typeof ac.newRole>> = {};
  for (const def of definitions) {
    roles[def.name] = ac.newRole(groupByResource(def.permissions));
  }

  return { ac, roles };
}
