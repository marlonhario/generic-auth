import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthClient } from "@marlonoirah/auth-client";
import type { User } from "@marlonoirah/auth-core";
import {
  configureServerAuth,
  getServerSession,
  requireServerSession,
} from "../src/server";

function makeUser(): User {
  return {
    id: "u1",
    name: "User",
    email: "user@example.com",
    emailVerified: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    role: "admin",
  };
}

function makeClient(sessionData: { user: User } | null): {
  client: AuthClient;
  getSession: ReturnType<typeof vi.fn>;
} {
  const getSession = vi.fn(async () => ({
    ok: true as const,
    data: sessionData
      ? { user: sessionData.user, session: { token: "t", expiresAt: new Date() } }
      : null,
  }));
  const client = {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession,
    currentUser: vi.fn(async () => null),
    forgetPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
  } as unknown as AuthClient;
  return { client, getSession };
}

describe("auth-react/server", () => {
  afterEach(() => {
    configureServerAuth({ headersProvider: () => new Headers() });
  });

  it("throws CONFIGURATION when used before configureServerAuth", async () => {
    configureServerAuth(null as unknown as Parameters<typeof configureServerAuth>[0]);
    await expect(getServerSession(makeClient(null).client)).rejects.toMatchObject({
      code: "CONFIGURATION",
    });
  });

  it("forwards request headers to getSession and returns the payload", async () => {
    const headers = new Headers({ cookie: "session=abc" });
    configureServerAuth({ headersProvider: () => headers });
    const { client, getSession } = makeClient({ user: makeUser() });

    const result = await getServerSession(client);

    expect(result?.user.email).toBe("user@example.com");
    expect(result?.user.role).toBe("admin");
    expect(getSession).toHaveBeenCalledWith(
      expect.objectContaining({ headers }),
    );
  });

  it("returns null for anonymous requests", async () => {
    configureServerAuth({ headersProvider: () => new Headers() });
    const { client } = makeClient(null);
    await expect(getServerSession(client)).resolves.toBeNull();
  });

  it("requireServerSession throws AuthError INVALID_SESSION when anonymous", async () => {
    configureServerAuth({ headersProvider: () => new Headers() });
    const { client } = makeClient(null);
    await expect(requireServerSession(client)).rejects.toMatchObject({
      code: "INVALID_SESSION",
    });
  });
});
