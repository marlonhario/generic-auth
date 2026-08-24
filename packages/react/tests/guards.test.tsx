import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { AuthClient } from "@marlonoirah/auth-client";
import type { SessionInfo, User } from "@marlonoirah/auth-core";
import {
  AuthGuard,
  AuthProvider,
  RequirePermission,
  RequirePermissions,
  RequireRole,
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

function makeClient(user: User | null): AuthClient {
  const session: SessionInfo = {
    token: "tok",
    expiresAt: new Date("2026-12-31T00:00:00Z"),
  };
  return {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(async () => ({
      ok: true as const,
      data: user ? { user, session } : null,
    })),
    currentUser: vi.fn(async () => null),
    forgetPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
  } as unknown as AuthClient;
}

function Wrapper({
  client,
  children,
}: {
  client: AuthClient;
  children?: ReactNode;
}) {
  return (
    <AuthProvider
      client={client}
      roles={{ admin: ["users.read", "users.delete"], member: ["projects.read"] }}
    >
      {children}
    </AuthProvider>
  );
}

describe("AuthGuard", () => {
  it("renders children for an authenticated session", async () => {
    render(
      <Wrapper client={makeClient(makeUser("member"))}>
        <AuthGuard fallback={<p>denied</p>}>
          <p>secret</p>
        </AuthGuard>
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByText("secret")).toBeTruthy());
    expect(screen.queryByText("denied")).toBeNull();
  });

  it("renders fallback when signed out or on session error", async () => {
    render(
      <Wrapper client={makeClient(null)}>
        <AuthGuard fallback={<p>denied</p>}>
          <p>secret</p>
        </AuthGuard>
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByText("denied")).toBeTruthy());
    expect(screen.queryByText("secret")).toBeNull();
  });
});

describe("RequireRole", () => {
  it("renders children only for matching roles", async () => {
    render(
      <Wrapper client={makeClient(makeUser("admin"))}>
        <RequireRole role="admin" fallback={<p>no-admin</p>}>
          <p>admin-view</p>
        </RequireRole>
        <RequireRole role="member" fallback={<p>no-member</p>}>
          <p>member-view</p>
        </RequireRole>
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByText("admin-view")).toBeTruthy());
    expect(screen.getByText("no-member")).toBeTruthy();
    expect(screen.queryByText("member-view")).toBeNull();
  });
});

describe("RequirePermission", () => {
  it("checks the permission set built from the role map", async () => {
    render(
      <Wrapper client={makeClient(makeUser("member"))}>
        <RequirePermission permission="projects.read" fallback={<p>blocked</p>}>
          <p>allowed</p>
        </RequirePermission>
        <RequirePermission permission="users.delete" fallback={<p>blocked-del</p>}>
          <p>never</p>
        </RequirePermission>
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByText("allowed")).toBeTruthy());
    expect(screen.getByText("blocked-del")).toBeTruthy();
    expect(screen.queryByText("never")).toBeNull();
  });
});

describe("RequirePermissions", () => {
  it("mode=all requires every permission; mode=any requires one", async () => {
    render(
      <Wrapper client={makeClient(makeUser("admin,member"))}>
        <RequirePermissions permissions={["users.read", "projects.read"]} mode="all">
          <p>all-granted</p>
        </RequirePermissions>
        <RequirePermissions
          permissions={["users.delete", "billing.manage"]}
          mode="any"
        >
          <p>any-granted</p>
        </RequirePermissions>
        <RequirePermissions
          permissions={["billing.manage", "reports.export"]}
          mode="any"
          fallback={<p>none-of-any</p>}
        >
          <p>never-any</p>
        </RequirePermissions>
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getByText("all-granted")).toBeTruthy());
    await waitFor(() => expect(screen.getByText("any-granted")).toBeTruthy());
    expect(screen.getByText("none-of-any")).toBeTruthy();
    expect(screen.queryByText("never-any")).toBeNull();
  });
});
