---
"@marlonoirah/auth-react": minor
---

Initial release. Headless React layer: `AuthProvider` (with client-side
role→permission map), session/role/permission hooks (`useSession`,
`useRoles`, `usePermissions`, …), guards with fallback rendering
(`AuthGuard`, `RequirePermission`, `RequireRole`, `RequirePermissions`),
zod-validated headless forms (login/register/forgot/reset/verify-email) whose
`submit()` returns the full result for post-success navigation, and the
framework-free `/server` entry (`configureServerAuth`, `getServerSession`,
`requireServerSession`) for React Server Components.
