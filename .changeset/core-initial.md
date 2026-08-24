---
"@marlonoirah/auth-core": minor
---

Initial release. Shared contracts for the auth library: `User`/`SessionInfo`
types (with admin-plugin role fields), `RoleConfig`, `"resource.action"`
permission sugar (`parsePermission`/`toStatement`/`toStatements`), the
`AuthErrorCode` taxonomy with HTTP-status mapping and typed `AuthError`, zod
input schemas, and the `AuthContext` interface.
