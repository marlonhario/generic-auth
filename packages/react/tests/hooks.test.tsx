import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { AuthClient } from "@marlonoirah/auth-client";
import type { SessionInfo, User } from "@marlonoirah/auth-core";
import {
  AuthProvider,
  parseUserRoles,
  usePermission,
  usePermissions,
  useRole,
  useRoles,
} from "../src";

function makeUser(role?: string): User {
  return {
    id: "u1",
    name: "User",
    email: "user@example.com",
    emailVerified: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...(role !== undefined ? { role } : {}),
  };
}

function makeSessionPayload(user: User | null) {
  const session: SessionInfo = {
    token: "tok",
    expiresAt: new Date("2026-12-31T00:00:00Z"),
  };
  return { ok: true as const, data: user ? { user, session } : null };
}

function makeClient(sessionResult: ReturnType<typeof makeSessionPayload>): AuthClient {
  return {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(async () => sessionResult),
    currentUser: vi.fn(async () => null),
    forgetPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
  } as unknown as AuthClient;
}

const roleMap = {
  admin: ["users.read", "users.delete"] as const,
  member: ["projects.read"] as const,
};

function makeWrapper(client: AuthClient) {
  return ({ children }: { children?: ReactNode }) => (
    <AuthProvider client={client} roles={roleMap}>
      {children}
    </AuthProvider>
  );
}

describe("parseUserRoles", () => {
  it("splits comma-separated roles and trims whitespace", () => {
    expect(parseUserRoles(makeUser("admin, member"))).toEqual([
      "admin",
      "member",
    ]);
  });

  it("returns empty array for undefined or empty roles", () => {
    expect(parseUserRoles(makeUser(undefined))).toEqual([]);
    expect(parseUserRoles(makeUser(""))).toEqual([]);
  });
});

describe("useRoles / useRole", () => {
  it("derives roles from the session user", async () => {
    const client = makeClient(makeSessionPayload(makeUser("admin,member")));
    const { result } = renderHook(() => useRoles(), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() =>
      expect(result.current).toEqual(["admin", "member"]),
    );
  });

  it("useRole reports membership", async () => {
    const client = makeClient(makeSessionPayload(makeUser("admin")));
    const { result } = renderHook(
      () => ({ admin: useRole("admin"), member: useRole("member") }),
      { wrapper: makeWrapper(client) },
    );
    await waitFor(() => expect(result.current.admin).toBe(true));
    expect(result.current.member).toBe(false);
  });
});

describe("usePermissions / usePermission", () => {
  it("grants permissions from all assigned roles", async () => {
    const client = makeClient(makeSessionPayload(makeUser("admin,member")));
    const { result } = renderHook(
      () => ({
        single: usePermission("users.delete"),
        missing: usePermission("billing.manage"),
        api: usePermissions(),
      }),
      { wrapper: makeWrapper(client) },
    );
    await waitFor(() => expect(result.current.single).toBe(true));
    expect(result.current.missing).toBe(false);
    expect(result.current.api.canAny(["nope.x", "projects.read"])).toBe(true);
    expect(result.current.api.canAll(["users.read", "projects.read"])).toBe(true);
    expect(result.current.api.canAll(["users.read", "nope.x"])).toBe(false);
  });

  it("denies everything for anonymous sessions", async () => {
    const client = makeClient(makeSessionPayload(null));
    const { result } = renderHook(() => usePermission("users.read"), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("denies when no role map was provided", async () => {
    const client = makeClient(makeSessionPayload(makeUser("admin")));
    const { result } = renderHook(() => usePermission("users.read"), {
      wrapper: ({ children }: { children?: ReactNode }) => (
        <AuthProvider client={client}>{children}</AuthProvider>
      ),
    });
    await waitFor(() => expect(result.current).toBe(false));
  });
});
