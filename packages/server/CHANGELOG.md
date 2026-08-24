# @marlonoirah/auth-server

## 0.1.0

### Minor Changes

- [`66f0912`](https://github.com/marlonhario/generic-auth/commit/66f091249a247fd84442f65e7f201b04897aba0b) Thanks [@marlonhario](https://github.com/marlonhario)! - Initial release. `createAuthServer()` facade over Better Auth 1.7.1: Drizzle
  adapter wiring (`database`) or native escape hatch (`databaseAdapter`),
  always-wired admin plugin with configurable defaults, optional organization
  plugin, email/reset templates routed through an injectable `EmailSender`,
  request-based authorization helpers (`resolveContext`, `requirePermission`,
  `requireAnyPermission`), Fastify + tRPC adapters, environment validation, and
  the artifacts-only `auth-cli` (`generate`/`init`) emitting authoritative DDL.
  Includes integration tests against a real Better Auth instance using the
  memory adapter.

### Patch Changes

- Updated dependencies [[`66f0912`](https://github.com/marlonhario/generic-auth/commit/66f091249a247fd84442f65e7f201b04897aba0b)]:
  - @marlonoirah/auth-core@0.1.0
