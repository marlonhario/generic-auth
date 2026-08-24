# ADR-0006: `resource.action` Permission Syntax Is a Convenience Layer Only

- **Status:** Accepted
- **Date:** 2026-08-24

## Context

Better Auth models access control structurally as statements:

```ts
{
  project: ["create", "read", "update", "delete"]
}
```

while the desired developer-facing API is flat strings:

```ts
auth.can("project.read");
```

There is a risk of letting the string format become the underlying authorization mechanism
(e.g., parsing and matching raw strings as the security check), which would quietly create a
second RBAC evaluation layer — forbidden by ADR-0001.

## Decision

`"resource.action"` strings are accepted as **input sugar only**. The library translates them
at the boundary:

```text
"users.read"
   ↓ parse (split on first ".")
resource = "users", action = "read"
   ↓ construct
{ users: ["read"] }
   ↓ delegate
Better Auth Access Control (hasPermission)
```

Rules:

1. All permission **evaluation** delegates to Better Auth; the library never performs its own
   allow/deny decision on parsed strings.
2. The string syntax is never validated *as* a security constraint; unknown resources/actions
   produce errors from Better Auth's own checks, not custom string matching.
3. TypeScript convenience types (e.g., template-literal permission names) are DX sugar for
   autocomplete only and carry no security semantics.
4. Multi-permission helpers (`hasAllPermissions`, `hasAnyPermissions`) translate to arrays of
   statement objects in a single delegated call.

## Consequences

- Clean, familiar developer experience without owning evaluation logic.
- If Better Auth's statement shape changes, only the translation layer changes.
