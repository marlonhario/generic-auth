# Architecture — Generic Authentication + RBAC Library

**Scope:** `@marlonoirah/auth-core`, `@marlonoirah/auth-server`, `@marlonoirah/auth-client`,
`@marlonoirah/auth-react`
**Supersedes:** the original "AI Implementation Instructions" draft (decisions folded in below)
**Decision records:** [`docs/adr/`](./adr/) — ADR-0001 … ADR-0006
**Publishing:** blocked until the first release is explicitly approved.

---

## 1. Objective

A reusable, application-agnostic authentication and authorization system usable across many
future applications. It supports authentication, session management, user management, OAuth,
email verification, password reset, generic permission-based RBAC, and **optional**
multi-tenant authorization — with framework-independent logic and theme-independent frontend
components. It contains no assumptions about any business domain.

**Foundation: Better Auth (`1.7.1`, pinned).** The library is a stable facade over it, not a
second framework (ADR-0001).

```text
                 @marlonoirah/auth (this library)
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
  auth-core          auth-client        auth-server ─── Better Auth
  (contracts)             │              (adapters)         │
                          ▼            ┌──────┴──────┐   Authentication
                     auth-react        │             │   Access Control
                          │       Fastify/tRPC    Next.js  Organization (optional)
                          ▼
                    Headless UI / Hooks
```

## 2. Ownership Map

| Concern | Owner |
|---|---|
| Credentials, hashing, sessions, cookies, CSRF | Better Auth |
| Email verification, password reset, account linking | Better Auth |
| OAuth/social sign-in | Better Auth plugins |
| 2FA (TOTP/backup codes), passkeys | Better Auth plugins |
| Access control statements, roles, permission checking | Better Auth Access Control |
| Global role assignment, ban, impersonation | Better Auth admin plugin |
| Tenants, memberships, invitations, dynamic tenant roles | Better Auth Organization plugin (**optional**) |
| Stable APIs, adapters, headless React, TS contracts | This library |

**Guardrail:** custom persistence/authorization only via a new ADR proving a verified Better
Auth limitation (ADR-0001). No silent architectural changes during implementation.

## 3. Packages & Dependencies

See ADR-0002. Direction: `core ← client ← react`, `core ← server`. No circular deps; core has
minimal deps; client has no UI framework; server has no React; DB details never leave
`auth-server`'s internals. Boundary rule: an example importing package internals = bug in the
package. Optional `@marlonoirah/auth-ui` deferred until a second app validates headless APIs.

## 4. Key Decisions (summary)

| Decision | Choice |
|---|---|
| RBAC engine | None of our own — delegate to Better Auth (ADR-0001) |
| Global roles v1 | Config-defined via `roles: RoleConfig`; no role tables (ADR-0001) |
| Role CRUD endpoints | Not exposed globally; only where BA provides the model (org routes) |
| Tenancy | `organization: { enabled }` → BA Organization plugin; off by default |
| Permission syntax | `"resource.action"` input sugar → `{ resource: [action] }` delegation (ADR-0006) |
| Multi-role users | Supported; permissions combine across roles |
| Role hierarchy | No (v1) |
| Permission caching / Redis | No (v1); measure first |
| Database | Drizzle + PostgreSQL inside auth-server; Prisma-adapter documented alternative (ADR-0003) |
| Schema delivery | Artifacts via `auth-cli init/generate`; consumer applies migrations; no migrate engine (ADR-0004) |
| Sessions | Cookie-token based (BA native); **no `/refresh` endpoint exists or is needed** |
| Version pin | `better-auth@1.7.1` exact + upgrade policy (ADR-0005) |

## 5. Security Requirements

Secure defaults enforced by the factory: HttpOnly + `Secure` (prod) + SameSite cookies,
trusted-origin allowlist, rate limiting (pluggable), password hashing, session
expiration/revocation, reset/verification token expiry, OAuth state protection, secure
redirect validation, zod input validation, brute-force protection. No custom cryptography.
Frontend guards are UX only — the backend independently enforces every permission.

Secrets never reach frontend packages: DB credentials, OAuth secrets, signing keys, Redis
credentials are server-only.

## 6. Error Contract

Stable machine-readable codes (`AuthErrorCode`) mapped to HTTP statuses; part of the public
API and semver-governed. Codes enable i18n at the application layer. See
`public-api-contracts.md`.

## 7. Testing Strategy

- **Unit:** translation layer, error mapping, context resolver, role config parsing — 100%
  branch coverage on permission-related checks.
- **Integration:** docker-compose PostgreSQL; register/login/logout/session/reset/verify/
  OAuth-mock/2FA; multi-role aggregation; org flows when enabled. This suite is also the
  Better Auth compatibility gate (ADR-0005).
- **E2E:** through both example apps.
- **Boundary check:** examples import public entry points only.

## 8. Migration Concerns (existing applications)

Inspect-first per original plan: audit current auth/schema/sessions/RBAC before touching an
app. bcrypt → scrypt transparent rehash-on-login; forced session invalidation at cutover;
existing per-org Role tables (retailflow/modern-pos pattern) map onto Organization dynamic
roles. Preserve working functionality unless there is a clear reason to change.

## 9. Implementation Phases

0. Scaffold monorepo (pnpm + turbo, tsup, strict tsconfig, vitest, changesets, CI)
1. `auth-core` — types, zod schemas, error codes, permission helpers
2. `auth-server` — factory, Drizzle schema, translation layer, resolver, Fastify adapter,
   hooks, env validation, CLI
3. `auth-client` — thin wrapper over `better-auth/client`
4. `auth-react` — provider, hooks, guards, headless forms, RSC helpers
5. Tests (unit → integration → E2E)
6. Next.js/RSC + tRPC adapters; complete both examples
7. Validation, docs, changeset `0.1.0` — release/publish requires explicit approval

## 10. Explicit Non-Goals (v1)

Custom RBAC persistence · global runtime-editable roles · role CRUD endpoints · role
hierarchy · ABAC/row-level filtering · Redis caching · prebuilt UI package · migration
engine · any application-specific roles, permissions, entities, terminology, or business
logic.
