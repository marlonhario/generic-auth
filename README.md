# @marlonoirah/auth — Generic Authentication + RBAC Library

Reusable, application-agnostic authentication and authorization built on
[Better Auth](https://better-auth.com) (`1.7.1`, pinned). See
[`ARCHITECTURE.md`](./ARCHITECTURE.md) and the [ADRs](./docs/adr/).

## Packages

| Package | Purpose |
|---|---|
| `@marlonoirah/auth-core` | Shared TypeScript contracts, zod schemas, error codes (zero deps) |
| `@marlonoirah/auth-server` | `createAuthServer()`, Better Auth wiring, Drizzle schema, framework adapters |
| `@marlonoirah/auth-client` | Framework-independent client wrapping Better Auth client |
| `@marlonoirah/auth-react` | Headless, theme-independent React provider, hooks, guards, forms |

## Status

**Implemented and tested** — all four packages are feature-complete per
`ARCHITECTURE.md`: 94 tests green (`build`/`typecheck`/`test` via turbo).
Integration coverage runs a real Better Auth instance against an in-memory
adapter through the facade.

> ✅ **Published.** All four packages are live on npm (`0.1.0`, MIT). Releases
> are fully automated via [changesets](https://github.com/changesets/changesets):
> push a changeset, merge the auto-opened **Version Packages** PR, and CI builds,
> publishes, tags, and creates GitHub releases.

## Installation

```bash
pnpm add @marlonoirah/auth-core @marlonoirah/auth-server   # server
pnpm add @marlonoirah/auth-client                          # any JS client
pnpm add @marlonoirah/auth-react                           # React apps
```

## Quickstart

```ts
// 1. Define roles once — shared by server AND client.
export const roles = [
  { name: "admin", permissions: ["users.read", "users.delete"] },
  { name: "member", permissions: ["projects.read"] },
] as const;

// 2. Server: Better Auth wiring behind a stable facade.
import { createAuthServer } from "@marlonoirah/auth-server";
const authServer = createAuthServer({
  database: drizzle(process.env.DATABASE_URL), // Drizzle + PostgreSQL primary
  secret: process.env.AUTH_SECRET!,
  baseURL: "https://app.example.com",
  roles,
  admin: { defaultRole: "member" },
  email: myEmailSender,
});

// Route-level enforcement (Fastify adapter shown; tRPC also included):
await authServer.requirePermission(request, "users.delete");

// 3. Client: never-throws result unions, stable error codes.
import { createAuthClient } from "@marlonoirah/auth-client";
const client = createAuthClient({ baseURL: "https://app.example.com" });
const result = await client.signIn({ email, password });
if (!result.ok) console.error(result.error.code); // e.g. "INVALID_CREDENTIALS"

// 4. React: guards are UX only — the server remains the boundary.
<AuthProvider client={client} roles={roles}>
  <RequirePermission permission="projects.read" fallback={null}>
    <Projects />
  </RequirePermission>
</AuthProvider>
```

See [`docs/public-api-contracts.md`](./docs/public-api-contracts.md) for exact
signatures and the authoritative list of implementation deviations, and
[`examples/basic`](./examples/basic) for full wiring.

## Development

```bash
pnpm install
pnpm build        # turbo: all packages
pnpm typecheck
pnpm test
```
