# AGENTS.md

Guidance for coding agents working in this repository.

## Repository

pnpm + turbo monorepo (`packages/*`, `examples/*`). Library scope:
`@marlonoirah/auth-*` — authentication + RBAC facade over **Better Auth
`1.7.1` (pinned exact, ADR-0005)**. All packages are `private`; publishing is
blocked until explicitly approved.

## Commands (all run from the repo root)

```bash
pnpm install            # after changing dependencies
pnpm build              # turbo: build all packages (tsup)
pnpm typecheck          # turbo: tsc --noEmit everywhere (incl. examples)
pnpm test               # turbo: vitest per package
```

Run one package: `pnpm --filter @marlonoirah/auth-server test`

PostgreSQL-gated integration tests (org mode) run only when
`AUTH_TEST_PG_URL` points at a disposable database; they wipe and recreate the
public schema from CLI-generated DDL. Run them directly (not through turbo,
which caches without hashing arbitrary env vars):

```bash
docker compose up -d test-db
AUTH_TEST_PG_URL="postgres://postgres:postgres@127.0.0.1:5544/auth_test" \
  pnpm --filter @marlonoirah/auth-server exec vitest run tests/integration-org.test.ts
```

CI runs this suite automatically (service container + same env var).

There is no linter configured; `typecheck` + `test` are the gates. CI
(`.github/workflows/ci.yml`) runs install → build → typecheck → test.

## Conventions

- Strict TypeScript: `tsconfig.base.json` enables `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`. Optional props must be passed via conditional
  spread, not `prop: maybeUndefined`.
- Tests use vitest; React tests need jsdom + `globals: true`
  (see `packages/react/vitest.config.ts`) for Testing Library cleanup.
- Never bump `better-auth` — it is pinned exact by ADR-0005.
- Error codes come from `@marlonoirah/auth-core` (`AuthErrorCode`); adding a
  code requires updating the maps in `errors.ts` and server `trpc-codes.ts`.
- Workspace deps use `workspace:*`. After editing a package's public types,
  rebuild it before dependent packages typecheck against stale `dist/`.
- Build order: fresh checkout — always build via full `pnpm build` (turbo
  topological). Scoped builds (`pnpm --filter <pkg> build`) require dependency
  `dist/` artifacts to already exist — a failure there is an ordering
  artifact, not a package defect.

## Key documents

- `ARCHITECTURE.md` — system design and phased plan
- `docs/public-api-contracts.md` — API contracts; the "Implemented deviations"
  section is authoritative where it conflicts with sketches above it
- `docs/adr/0001–0006` — binding decisions (RBAC guardrails, package layout,
  Drizzle+PostgreSQL primary, artifacts-only CLI, version pin, permission sugar)
