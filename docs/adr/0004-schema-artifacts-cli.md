# ADR-0004: Schema Artifacts and Minimal CLI — No Migration Engine

- **Status:** Accepted
- **Date:** 2026-08-24

## Context

`auth-server` owns its database schema (ADR-0003), so consuming applications need a
predictable way to provision those tables. The library must never silently modify a
production database, and building a hand-rolled migration framework inside an authentication
library would duplicate existing tooling and violate the ownership boundaries of ADR-0001.

## Decision

The library ships **artifacts**, and the **consuming application applies** them.

`@marlonoirah/auth-server` provides a minimal CLI:

| Command | Behavior (v1) |
|---|---|
| `auth-cli init` | Detects the consumer's setup; writes the required schema artifacts into the project (Drizzle schema fragment and/or raw SQL DDL file) with a clear summary of what was created |
| `auth-cli generate` | Regenerates/updates schema artifacts from the current pinned Better Auth model |

Explicitly out of scope for v1:

- `migrate` / `status` subcommands — deferred until the raw-SQL path has real consumers
- Any automatic execution of DDL against a database
- Integration into Prisma Migrate / drizzle-kit as a plugin

Applications apply changes with their own migration tooling (`drizzle-kit`, `prisma migrate`,
or plain SQL), reviewing the generated artifacts like any other code change.

## Consequences

- No surprise schema changes; consumers keep full control of their databases.
- The CLI stays tiny; a migration engine can be added later without breaking `init`.
- Consumers on Prisma-only setups either run the DDL directly or use Better Auth's Prisma
  adapter path documented in ADR-0003.
