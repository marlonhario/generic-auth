# Auth Contract & Integration Matrix

Traceability from contract to implementation to test to CI gate. Where this
table and `public-api-contracts.md` disagree, the contracts file (including its
"Implemented deviations" section) wins.

| Capability | Contract | Implementation | Tests | CI |
| --- | --- | --- | --- | --- |
| Sign in / sign up / sign out | §auth-client, §HTTP surface | `client.ts` wrapper · BA `/sign-in/email`, `/sign-up/email`, native routes | client 14 tests · server integration (memory) | Test step |
| Session retrieval | `getSession` + RSC headers | `client.getSession({headers})` → `fetchOptions.headers` | client suite · react server suite | Test step |
| Current user helper | `currentUser()` | `client.ts` | client suite | Test step |
| Password reset flow | `forgetPassword`/`resetPassword` | wrapper calls renamed BA `requestPasswordReset`; route `/request-password-reset` | memory integration (EmailSender port) | Test step |
| Email verification | `verifyEmail` | wrapper `{query:{token}}` | client suite · react forms | Test step |
| Error taxonomy | `AuthErrorCode` ⇄ HTTP/tRPC maps | core `errors.ts`, server `trpc-codes.ts`, client `result.ts` mapping | core errors suite · client suite · tRPC suite | Test step |
| Client permission UX (never enforcement) | ADR-0006, deviations | react `usePermissions` set-membership over app-provided role map | react hooks/guards suites | Test step |
| Server-side enforcement | ADR-0001/0006 | `resolveContext`, `requirePermission(s)`, Fastify preHandlers, tRPC middleware | access-control suite · tRPC suite · memory integration | Test step |
| Trusted origins / CSRF | `trustedOrigins?`, deviations ⚠️ | BA origin check; **auto-disabled when NODE_ENV=test** — re-enable via `advanced.disableOriginCheck:false` | memory integration: cross-origin 403 vs same-origin 200 | Test step |
| Cookie behavior | `advanced?` passthrough | `Secure` derived from baseURL scheme; `HttpOnly`+`SameSite=Lax` defaults | memory integration Set-Cookie assertions | Test step |
| Production URL guard | `loadEnv` contract | `env.ts` refuses `http://` base URL in production (`CONFIGURATION`) | env suite | Test step |
| Organization tenancy | ADR-0001 optional plugin, shared-AC note | facade wires org plugin with same AccessControl | **PG E2E**: create→invite→accept→membership | **Integration (PostgreSQL) step** |
| Schema artifacts | ADR-0004 CLI | `generateSchemaSql` via BA migrations | cli suite · PG E2E self-provisions DDL | Both steps |
| Refresh tokens | N/A **by design** | cookie-session model; no token refresh exists | — | — |

## Gaps intentionally open (future work)

- `ServerHooks`: only `onUserCreated` wired; login/role/invitation hooks
  deferred (see deviations).
- Rate limiter: extension point only; no bundled implementation.
- tRPC E2E against a real router: structural tests cover the adapter; a full
  router test is added only if an application depends on that behavior.

## Upgrade protocol (Better Auth bumps)

1. Pin bump lands in a branch; lockfile diff reviewed first.
2. Full local gates + PG E2E via `docker compose`.
3. Re-verify every "Observed behavior" row above against the new version;
   update the matrix where semantics shifted.
4. New ADR for any pin change (extends ADR-0005); never silent.
