import { describe, expect, it, vi } from "vitest";
import { AuthError } from "@marlonoirah/auth-core";
import type { AuthContext } from "@marlonoirah/auth-core";
import { createTrpcMiddleware } from "../src/adapters/trpc";
import {
  authErrorToTrpcCode,
  toAuthError,
} from "../src/adapters/trpc-codes";
import type { AuthServerInstance } from "../src/server";

function fakeInstance(context: () => Promise<AuthContext>): AuthServerInstance {
  return {
    resolveContext: context,
  } as unknown as AuthServerInstance;
}

function fakeContext(overrides: Partial<AuthContext> = {}): AuthContext {
  const roles = overrides.roles ?? ["viewer"];
  return {
    user: { id: "u1", name: "Test", email: "t@e.st", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    session: { id: "s1", userId: "u1", expiresAt: new Date() },
    roles,
    can: async (permission) => permission === "users.read",
    hasRole: (role) => roles.includes(role),
    hasAnyRole: (candidates) => candidates.some((role) => roles.includes(role)),
    ...overrides,
  };
}

describe("createTrpcMiddleware", () => {
  it("attaches auth context to the next ctx", async () => {
    const instance = fakeInstance(() => Promise.resolve(fakeContext()));
    const middleware = createTrpcMiddleware(instance);
    const next = vi.fn(async () => "ok");
    const result = await middleware({
      ctx: { req: new Request("https://x.test/", { headers: { cookie: "a=b" } }) },
      next: next as never,
    });
    expect(result).toBe("ok");
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        ctx: expect.objectContaining({ auth: expect.objectContaining({ user: expect.anything() }) }),
      }),
    );
  });

  it("extracts plain-object headers when req is not a web Request", async () => {
    let received: Headers | undefined;
    const instance = {
      resolveContext: async ({ headers }: { headers: Headers }) => {
        received = headers;
        return fakeContext();
      },
    } as unknown as AuthServerInstance;

    await createTrpcMiddleware(instance)({
      ctx: { req: { headers: { authorization: "Bearer x" } } },
      next: async () => "ok",
    });
    expect(received?.get("authorization")).toBe("Bearer x");
  });

  it("throws AuthError when session missing", async () => {
    const instance = fakeInstance(() =>
      Promise.reject(new AuthError("INVALID_SESSION")),
    );
    await expect(
      createTrpcMiddleware(instance)({ ctx: {}, next: async () => "ok" }),
    ).rejects.toThrow(AuthError);
  });

  it("denies when permission check fails", async () => {
    const instance = fakeInstance(() => Promise.resolve(fakeContext()));
    const middleware = createTrpcMiddleware(instance, {
      permission: "users.delete",
    });
    await expect(
      middleware({ ctx: {}, next: async () => "ok" }),
    ).rejects.toThrow(/Missing permission "users\.delete"/);
  });

  it("passes when permission check succeeds", async () => {
    const instance = fakeInstance(() => Promise.resolve(fakeContext()));
    const middleware = createTrpcMiddleware(instance, {
      permission: "users.read",
    });
    await expect(
      middleware({ ctx: {}, next: async () => "allowed" }),
    ).resolves.toBe("allowed");
  });

  it("propagates the resolved auth context to next even with permission option", async () => {
    const instance = fakeInstance(() =>
      Promise.resolve(fakeContext({ roles: ["manager"] })),
    );
    const middleware = createTrpcMiddleware(instance, {
      permission: "users.read",
    });
    const next = vi.fn(async () => null);
    await middleware({ ctx: {}, next: next as never });
    const passedCtx = next.mock.calls[0]?.[0]?.ctx as { auth: AuthContext };
    expect(passedCtx.auth.hasRole("manager")).toBe(true);
  });
});

describe("trpc code mapping", () => {
  it("maps auth errors to trpc codes", () => {
    expect(authErrorToTrpcCode(new AuthError("INVALID_SESSION"))).toBe("UNAUTHORIZED");
    expect(authErrorToTrpcCode(new AuthError("INSUFFICIENT_PERMISSIONS"))).toBe("FORBIDDEN");
    expect(authErrorToTrpcCode(new AuthError("RATE_LIMITED"))).toBe("TOO_MANY_REQUESTS");
    expect(authErrorToTrpcCode(new Error("random"))).toBe("INTERNAL_SERVER_ERROR");
  });

  it("round-trips serialized auth errors", () => {
    const coded = new Error("gone");
    (coded as unknown as { code: string }).code = "SESSION_EXPIRED";
    expect(toAuthError(coded)?.code).toBe("SESSION_EXPIRED");
    expect(toAuthError(coded)?.message).toBe("gone");

    expect(toAuthError({ message: "not an error instance" })).toBeUndefined();
    expect(toAuthError(new Error("plain"))).toBeUndefined();
  });
});
