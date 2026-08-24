import { describe, expect, it } from "vitest";
import { memoryAdapter } from "better-auth/adapters/memory";
import { createAuthServer, type AuthServerInstance } from "../src";

const BASE = "http://localhost:3000";

interface SentEmail {
  to: string;
  subject: string;
}

function makeServer(roleConfig: Parameters<typeof createAuthServer>[0]["roles"], defaultRole?: string) {
  const sentEmails: SentEmail[] = [];
  const server = createAuthServer({
    secret: "integration-test-secret-0123456789abcdef",
    baseURL: BASE,
    roles: roleConfig,
    ...(defaultRole !== undefined ? { admin: { defaultRole } } : {}),
    email: {
      send: async (input) => {
        sentEmails.push({ to: input.to, subject: input.subject });
      },
    },
    databaseAdapter: memoryAdapter({
      user: [],
      session: [],
      account: [],
      verification: [],
    }),
  });
  return { server, sentEmails };
}

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function signUp(
  server: AuthServerInstance,
  email: string,
): Promise<string> {
  const response = await server.handler(
    jsonRequest("/api/auth/sign-up/email", {
      name: "Test User",
      email,
      password: "supersecret123",
    }),
  );
  if (!response.ok) {
    throw new Error(`sign-up failed: ${response.status} ${await response.text()}`);
  }
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

describe("integration: real Better Auth instance via the facade", () => {
  it("sign-up sets a session cookie; get-session returns the user with the default role", async () => {
    const roles = [
      { name: "admin", permissions: ["users.read", "users.delete"] as const },
    ];
    const { server } = makeServer(roles, "admin");

    const cookie = await signUp(server, "admin@example.com");
    expect(cookie).toContain("better-auth.session_token=");

    const response = await server.handler(
      new Request(`${BASE}/api/auth/get-session`, {
        headers: { cookie },
      }),
    );
    expect(response.ok).toBe(true);
    const payload = (await response.json()) as {
      user?: { email?: string; role?: string };
    };
    expect(payload.user?.email).toBe("admin@example.com");
    expect(payload.user?.role).toBe("admin");
  });

  it("resolveContext exposes roles and permission checks for a signed-in user", async () => {
    const roles = [
      {
        name: "admin",
        permissions: ["users.read", "users.delete"] as const,
      },
      { name: "member", permissions: ["projects.read"] as const },
    ];
    const { server } = makeServer(roles, "admin");
    const cookie = await signUp(server, "ctx@example.com");

    const context = await server.resolveContext({
      headers: new Headers({ cookie }),
    });

    expect(context.roles).toEqual(["admin"]);
    expect(await context.can("users.read")).toBe(true);
    expect(await context.can("users.delete")).toBe(true);
    expect(await context.can("projects.read")).toBe(false);
    expect(context.hasRole("admin")).toBe(true);
    expect(context.hasAnyRole(["member", "admin"])).toBe(true);
  });

  it("requirePermission passes for granted permissions and throws INSUFFICIENT_PERMISSIONS otherwise", async () => {
    const roles = [{ name: "member", permissions: ["projects.read"] as const }];
    const { server } = makeServer(roles, "member");
    const cookie = await signUp(server, "member@example.com");
    const request = { headers: new Headers({ cookie }) };

    await expect(
      server.requirePermission(request, "projects.read"),
    ).resolves.toBeUndefined();

    await expect(
      server.requirePermission(request, "users.delete"),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
  });

  it("sign-in with wrong credentials returns 401", async () => {
    const roles = [{ name: "member", permissions: [] as const }];
    const { server } = makeServer(roles, "member");
    await signUp(server, "wrongpw@example.com");

    const response = await server.handler(
      jsonRequest("/api/auth/sign-in/email", {
        email: "wrongpw@example.com",
        password: "definitely-wrong",
      }),
    );

    expect(response.status).toBe(401);
  });

  it("resolveContext throws INVALID_SESSION without a cookie", async () => {
    const roles = [{ name: "member", permissions: [] as const }];
    const { server } = makeServer(roles);
    await expect(
      server.resolveContext({ headers: new Headers() }),
    ).rejects.toMatchObject({ code: "INVALID_SESSION" });
  });

  it("routes emails through the EmailSender port", async () => {
    const roles = [{ name: "member", permissions: [] as const }];
    const { server, sentEmails } = makeServer(roles, "member");
    await signUp(server, "mail@example.com");

    await server.handler(
      jsonRequest("/api/auth/request-password-reset", {
        email: "mail@example.com",
      }),
    );

    expect(sentEmails.some((email) => email.to === "mail@example.com")).toBe(
      true,
    );
    expect(sentEmails[0]?.subject).toBe("Reset your password");
  });

  it("rejects an authenticated cross-origin POST (CSRF)", async () => {
    // Better Auth silently skips origin checks when NODE_ENV=test, so the
    // test re-enables them explicitly — which also exercises the `advanced`
    // passthrough. In production the check is on by default.
    const roles = [{ name: "member", permissions: [] as const }];
    const server = createAuthServer({
      secret: "integration-test-secret-0123456789abcdef",
      baseURL: BASE,
      roles,
      admin: { defaultRole: "member" },
      email: { send: async () => {} },
      advanced: { disableOriginCheck: false },
      databaseAdapter: memoryAdapter({
        user: [],
        session: [],
        account: [],
        verification: [],
      }),
    });
    // Unauthenticated cross-origin requests are allowed by design
    // (no ambient credentials to abuse); the attack surface is a
    // cookie-carrying state change.
    const signUpResponse = await server.handler(
      jsonRequest("/api/auth/sign-up/email", {
        name: "Test User",
        email: "csrf-target@example.com",
        password: "supersecret123",
      }),
    );
    expect(signUpResponse.ok).toBe(true);
    const cookie = signUpResponse.headers
      .getSetCookie()
      .map((entry) => entry.split(";")[0])
      .join("; ");

    const response = await server.handler(
      new Request(`${BASE}/api/auth/sign-out`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
          cookie,
        },
        body: "{}",
      }),
    );

    // Observed behavior, not assumed: cross-origin writes are rejected.
    expect(response.ok).toBe(false);
    expect(response.status).toBe(403);
  });

  it("accepts an explicitly same-origin POST", async () => {
    const roles = [{ name: "member", permissions: [] as const }];
    const { server } = makeServer(roles, "member");
    await signUp(server, "same-origin@example.com");

    const response = await server.handler(
      new Request(`${BASE}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: BASE,
        },
        body: JSON.stringify({
          email: "same-origin@example.com",
          password: "supersecret123",
        }),
      }),
    );

    expect(response.ok).toBe(true);
  });

  it("marks session cookies SameSite by default and Secure when the base URL is https", async () => {
    const roles = [{ name: "member", permissions: [] as const }];

    const { server: httpServer } = makeServer(roles, "member");
    const httpCookieHeader = await signUp(httpServer, "cookies-http@example.com");
    void httpCookieHeader;
    const httpSignIn = await httpServer.handler(
      new Request(`${BASE}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: BASE,
        },
        body: JSON.stringify({
          email: "cookies-http@example.com",
          password: "supersecret123",
        }),
      }),
    );
    expect(httpSignIn.ok).toBe(true);
    const httpCookie = httpSignIn.headers.getSetCookie().join("; ");
    expect(httpCookie).toContain("HttpOnly");
    expect(httpCookie).toContain("SameSite=Lax");
    expect(httpCookie).not.toContain(" Secure");

    const secureBase = "https://secure.example.com";
    const httpsServer = createAuthServer({
      secret: "integration-test-secret-0123456789abcdef",
      baseURL: secureBase,
      roles,
      admin: { defaultRole: "member" },
      email: { send: async () => {} },
      databaseAdapter: memoryAdapter({
        user: [],
        session: [],
        account: [],
        verification: [],
      }),
    });
    await signUpOn(httpsServer, secureBase, "cookies-https@example.com");
    const httpsSignIn = await httpsServer.handler(
      new Request(`${secureBase}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: secureBase,
        },
        body: JSON.stringify({
          email: "cookies-https@example.com",
          password: "supersecret123",
        }),
      }),
    );
    expect(httpsSignIn.ok).toBe(true);
    const httpsCookie = httpsSignIn.headers.getSetCookie().join("; ");
    expect(httpsCookie).toContain("Secure");
  });
});

async function signUpOn(
  server: AuthServerInstance,
  base: string,
  email: string,
): Promise<void> {
  const response = await server.handler(
    new Request(`${base}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: base,
      },
      body: JSON.stringify({
        name: "Test User",
        email,
        password: "supersecret123",
      }),
    }),
  );
  if (!response.ok) {
    throw new Error(`sign-up failed: ${response.status}`);
  }
}
