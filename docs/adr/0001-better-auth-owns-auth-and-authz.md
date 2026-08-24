# ADR-0001: Better Auth Owns Authentication and Authorization

- **Status:** Accepted
- **Date:** 2026-08-24
- **Deciders:** Project owner

## Context

This repository provides a reusable, application-agnostic authentication and authorization
library (`@marlonoirah/auth-*`) intended to be consumed by many future applications with
different UIs, themes, roles, permissions, and tenancy models.

Building and maintaining custom authentication (password hashing, session security, OAuth,
email verification, password reset, 2FA) and a custom RBAC evaluation engine would turn this
library into a second authentication framework and split security responsibility across two
codebases. Better Auth already provides all of these capabilities as a framework-agnostic
TypeScript authentication **and authorization** framework:

- Core authentication: credentials, sessions (cookie-based), password hashing
- Plugins: OAuth/social, email verification, password reset, account linking, two-factor,
  passkeys, admin (role assignment, ban, impersonation), organization (tenancy)

## Decision

Better Auth is the underlying authentication and authorization provider.

Our packages provide only:

- Stable developer-facing APIs (stable across Better Auth upgrades)
- Framework adapters (Fastify, Next.js/RSC, tRPC)
- Headless React components and hooks
- TypeScript contracts shared between client and server
- Application integration ergonomics (config, env validation, event hooks)

We do **not** duplicate or reimplement:

- Authentication flows
- Password hashing / cryptography
- Session security, cookies, CSRF handling
- OAuth protocol handling
- RBAC evaluation logic
- Organization/membership persistence

### Guardrail (with teeth)

> Custom persistence or authorization logic may be introduced **only** when a concrete Better
> Auth limitation is documented **and verified**, and the bypass is approved through its own
> ADR. "Verified" means reproduced against the pinned Better Auth version with a failing test
> or documented upstream behavior — not asserted verbally.

Without this process, incremental additions ("let's just add role/permission tables") will
silently recreate a parallel RBAC system.

### Responsibility map

| Concern | Owner |
|---|---|
| Credentials, hashing, sessions, cookies | Better Auth |
| Email verification, password reset, account linking | Better Auth |
| OAuth/social sign-in | Better Auth plugin(s) |
| Two-factor (TOTP, backup codes), passkeys | Better Auth plugins |
| Access control statements, roles, permission checking | Better Auth Access Control |
| Global role assignment, ban, impersonation | Better Auth admin plugin |
| Tenants/orgs, memberships, invitations, dynamic tenant roles | Better Auth Organization plugin (optional, config-gated) |
| Stable API facade, adapters, headless React, TS contracts | This library |

## Consequences

- Security fixes arrive via Better Auth upgrades instead of our own patches (see ADR-0005).
- Global (non-tenant), runtime-editable roles backed by our own database tables are
  **out of scope in v1**; global roles are config-defined. Runtime-editable roles exist only
  where Better Auth provides the underlying model (Organization plugin dynamic roles).
- The library's value proposition is developer experience, stability, and headless UX — not
  security logic.
