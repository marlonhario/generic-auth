# @marlonoirah/example-basic

Reference wiring for the `@marlonoirah/auth-*` packages. Compile-checked
(`pnpm typecheck`) but intentionally not runnable without a PostgreSQL
instance.

## Files

| File | Purpose |
| --- | --- |
| `src/roles.ts` | Single source of truth for roles/permissions (shared by server + client) |
| `src/email.ts` | `EmailSender` port implementation |
| `src/server.ts` | `createAuthServer` + Fastify adapter + route-level guards |
| `src/client.ts` | `createAuthClient` + client-side role map |
| `src/app.tsx` | `AuthProvider`, guards, headless `LoginForm` |

## Key points

- The **same** `RoleConfig` feeds both sides; the server enforces, the client
  renders (guards are UX, never security).
- No custom auth endpoints exist — Better Auth's native routes are mounted at
  `/api/auth/*` via the Fastify adapter.
- Environment is validated up front with `loadEnv()` (fail fast).
