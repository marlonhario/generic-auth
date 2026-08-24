---
"@marlonoirah/auth-server": minor
---

Initial release. `createAuthServer()` facade over Better Auth 1.7.1: Drizzle
adapter wiring (`database`) or native escape hatch (`databaseAdapter`),
always-wired admin plugin with configurable defaults, optional organization
plugin, email/reset templates routed through an injectable `EmailSender`,
request-based authorization helpers (`resolveContext`, `requirePermission`,
`requireAnyPermission`), Fastify + tRPC adapters, environment validation, and
the artifacts-only `auth-cli` (`generate`/`init`) emitting authoritative DDL.
Includes integration tests against a real Better Auth instance using the
memory adapter.
