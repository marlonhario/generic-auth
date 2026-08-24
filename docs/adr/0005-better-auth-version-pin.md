# ADR-0005: Better Auth Version Pin and Upgrade Policy

- **Status:** Accepted
- **Date:** 2026-08-24

## Context

This library is effectively a stable API facade over Better Auth. Uncontrolled dependency
drift would let upstream breaking changes leak into every consuming application at once.
Additionally, several pre-1.7 Better Auth versions have published security advisories
(e.g., user enumeration affecting ≤ 1.6.25, CSRF issues fixed after 1.6.23, improper
authentication CVEs fixed by ~1.6.12), so floor versions matter.

## Decision

**Pinned version: `better-auth@1.7.1`** (exact, in `packages/server/package.json` via pnpm;
no `^` or `~` ranges).

Upgrade policy:

| Upstream change | Required action |
|---|---|
| Patch release (x.y.**Z**) | Routine dependency update; full test suite must pass |
| Minor release (x.**Y**.0) | Compatibility tests required before adoption; changelog review; changeset noting the bump |
| Major release (**X**.0.0) | Manual review required; dedicated ADR if behavior contracts change; staged rollout |

Additional rules:

1. The integration test suite doubles as the compatibility gate — no BA upgrade merges
   without it passing.
2. Security advisories against the pinned version trigger an immediate minor-policy upgrade
   (out-of-band, may skip feature work).
3. The exact effective version is recorded here and re-confirmed in each release's docs.

## Consequences

- Predictable behavior across all consuming applications.
- Upgrades are deliberate events with a paper trail instead of accidental lockstep drift.
