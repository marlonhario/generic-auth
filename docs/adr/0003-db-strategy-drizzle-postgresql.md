# ADR-0003: Database Strategy — Drizzle + PostgreSQL (Primary)

- **Status:** Accepted
- **Date:** 2026-08-24

## Context

Better Auth's database layer is Kysely-based, with first-class support for Drizzle adapters.
The consuming applications in this ecosystem predominantly use Prisma + PostgreSQL.

Two viable strategies existed for how `@marlonoirah/auth-server` obtains its database access:

1. **Drizzle inside auth-server (chosen):** the library owns its schema and database access
   via Drizzle, which maps natively onto Better Auth's expectations.
2. **Prisma adapter everywhere:** each consuming app wires Better Auth to its existing
   Prisma client via `better-auth/adapters/prisma`, keeping one ORM per app.

## Decision

**Drizzle + PostgreSQL is the initial database strategy** for `auth-server`.

- `createAuthServer()` accepts a Drizzle database instance (or connection config) and passes
  it through to Better Auth.
- The library owns its table set; consuming applications keep their own tables. Running two
  ORMs (app Prisma + library Drizzle) against one PostgreSQL database is acceptable because
  the table sets are disjoint.
- Database details remain internal to `auth-server`; they never leak into `auth-core`,
  `auth-client`, or `auth-react` public APIs (per ADR-0002).
- **Documented alternative:** applications that insist on a single ORM may use Better Auth's
  official Prisma adapter directly with their own Prisma client. This path is supported by
  Better Auth itself; we document it but do not build extra tooling around it.

## Consequences

- Lowest-friction integration with Better Auth (no adapter mismatch, no schema-sync dance).
- Schema artifacts (DDL) are shipped by the library for provisioning (see ADR-0004).
- If a future application requires the Prisma adapter path as primary, that change requires
  its own ADR.
