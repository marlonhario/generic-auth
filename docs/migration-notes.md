# Existing-App Migration Notes (post-v1)

Extracted from the original planning document before its removal. These
decisions apply to migrating existing applications onto `@marlonoirah/auth-*`;
they are not part of v1 scope.

## Password hash migration

- Strategy: **bcrypt → scrypt rehash-on-login**. Existing hashes stay valid;
  each successful login transparently re-hashes with Better Auth's default
  and rewrites the credential row.
- Do not bulk-rewrite hashes at cutover — plaintext-equivalent risk and
  downtime for zero user-visible gain.

## Session handling at cutover

- **Invalidate all sessions** during the migration window (single maintenance
  flag or `session` table truncation scoped to the app). Users re-authenticate
  once against the new stack.

## Role data mapping (retailflow / modern-pos)

- Existing per-organization `Role` tables map onto **Better Auth organization
  dynamic roles** via the org plugin, not global roles.
- Global app-level roles remain config-defined (`RoleConfig`) per ADR-0001;
  no role CRUD endpoints are added to support this.

## Process guardrails

- The inspect-first rule from the original engagement stands: read current
  auth behavior in the target app end-to-end before writing any migration
  code.
- Any discovered constraint that forces an architectural deviation follows the
  standing rule: document ⇒ propose ADR ⇒ approve ⇒ then build.
