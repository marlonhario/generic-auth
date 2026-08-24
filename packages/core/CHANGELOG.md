# @marlonoirah/auth-core

## 0.1.0

### Minor Changes

- [`66f0912`](https://github.com/marlonhario/generic-auth/commit/66f091249a247fd84442f65e7f201b04897aba0b) Thanks [@marlonhario](https://github.com/marlonhario)! - Initial release. Shared contracts for the auth library: `User`/`SessionInfo`
  types (with admin-plugin role fields), `RoleConfig`, `"resource.action"`
  permission sugar (`parsePermission`/`toStatement`/`toStatements`), the
  `AuthErrorCode` taxonomy with HTTP-status mapping and typed `AuthError`, zod
  input schemas, and the `AuthContext` interface.
