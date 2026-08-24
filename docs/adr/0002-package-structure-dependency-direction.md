# ADR-0002: Package Structure and Dependency Direction

- **Status:** Accepted
- **Date:** 2026-08-24

## Context

The library must serve multiple unrelated applications with different UI frameworks,
authorization models, and tenancy needs, while keeping package boundaries meaningful and
avoiding circular dependencies.

npm scope: **`@marlonoirah`**. Nothing is published until package names and first release are
approved.

## Decision

pnpm workspaces + Turborepo monorepo inside `generic/`:

```text
packages/
├── core      → @marlonoirah/auth-core     # types, zod schemas, error codes — zero runtime deps
├── server    → @marlonoirah/auth-server   # createAuthServer(), Better Auth wiring, Drizzle schema,
│                                         #   generic request resolver, framework adapters, cli
├── client    → @marlonoirah/auth-client   # wraps better-auth/client — framework-free
└── react     → @marlonoirah/auth-react    # provider, hooks, guards, headless forms, RSC helpers
examples/
├── fastify-api                            # proves non-Next.js backend support
└── nextjs-app                             # proves App Router / RSC integration
```

Dependency direction (arrows point at dependencies):

```text
auth-core ← auth-client ← auth-react
auth-core ← auth-server
```

Rules:

1. No circular dependencies.
2. `auth-core` has minimal dependencies (zod only).
3. `auth-client` must not depend on any frontend UI framework.
4. `auth-server` must not depend on React or any frontend framework.
5. Database implementation details never appear in `auth-core`, `auth-client`, or
   `auth-react` public APIs.
6. An optional `@marlonoirah/auth-ui` (prebuilt screens) may be added later, depending on
   `auth-react`; deferred until a second real application validates the headless API shape.
7. Boundary enforcement rule: if an example app ever imports another package's internals,
   that is a boundary bug to fix in the packages, not in the example.
8. Publishing gate: no `publish` until the npm scope ownership is confirmed and the first
   release is explicitly approved by the project owner.

## Consequences

- Applications can use `auth-server` alone (API-only apps), or add `auth-client`/`auth-react`
  for frontends, without pulling unused code.
- Framework independence is proven by building both example stacks rather than assuming one.
