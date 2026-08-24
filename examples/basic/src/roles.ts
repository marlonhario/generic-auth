/**
 * Shared role/permission definitions — THE single source of truth.
 * The same config is handed to createAuthServer (server enforcement)
 * and AuthProvider (client-side UX checks).
 */
import type { RoleConfig } from "@marlonoirah/auth-core";

export const roles = [
  {
    name: "admin",
    permissions: ["users.read", "users.delete", "projects.read", "projects.write"],
    description: "Full administrative access",
  },
  {
    name: "member",
    permissions: ["projects.read", "projects.write"],
    description: "Can work with projects",
  },
  {
    name: "viewer",
    permissions: ["projects.read"],
    description: "Read-only access",
  },
] as const satisfies RoleConfig;
