# @marlonoirah/auth-react

## 0.1.0

### Minor Changes

- [`66f0912`](https://github.com/marlonhario/generic-auth/commit/66f091249a247fd84442f65e7f201b04897aba0b) Thanks [@marlonhario](https://github.com/marlonhario)! - Initial release. Headless React layer: `AuthProvider` (with client-side
  role→permission map), session/role/permission hooks (`useSession`,
  `useRoles`, `usePermissions`, …), guards with fallback rendering
  (`AuthGuard`, `RequirePermission`, `RequireRole`, `RequirePermissions`),
  zod-validated headless forms (login/register/forgot/reset/verify-email) whose
  `submit()` returns the full result for post-success navigation, and the
  framework-free `/server` entry (`configureServerAuth`, `getServerSession`,
  `requireServerSession`) for React Server Components.

### Patch Changes

- Updated dependencies [[`66f0912`](https://github.com/marlonhario/generic-auth/commit/66f091249a247fd84442f65e7f201b04897aba0b), [`66f0912`](https://github.com/marlonhario/generic-auth/commit/66f091249a247fd84442f65e7f201b04897aba0b)]:
  - @marlonoirah/auth-client@0.1.0
  - @marlonoirah/auth-core@0.1.0
