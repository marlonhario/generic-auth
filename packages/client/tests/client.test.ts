import { describe, expect, it, vi } from "vitest";
import { createAuthClient } from "../src/client";
import { normalizeClientError } from "../src/result";

type FetchCall = { url: string; init: RequestInit };

function makeFetch(status: number, body: unknown) {
  const calls: FetchCall[] = [];
  const impl = async (input: Request | string | URL, init?: RequestInit) => {
    calls.push({
      url: typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      init: init ?? {},
    });
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
  return { impl, calls };
}

function clientWith(fetchImpl: (input: Request | string | URL, init?: RequestInit) => Promise<Response>) {
  return createAuthClient({
    baseURL: "http://localhost:9999",
    fetchOptions: { customFetchImpl: fetchImpl },
  });
}

describe("createAuthClient", () => {
  it("signs in and maps the user", async () => {
    const { impl } = makeFetch(200, { user: { id: "u1", name: "Marlon", email: "a@b.c", emailVerified: true }, session: null });
    const result = await clientWith(impl).signIn({ email: "a@b.c", password: "pw123456" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user).toMatchObject({ id: "u1", email: "a@b.c", name: "Marlon" });
      expect(result.data.user.createdAt).toBeInstanceOf(Date);
    }
  });

  it("maps invalid credentials to a stable code", async () => {
    const { impl } = makeFetch(401, { code: "INVALID_EMAIL_OR_PASSWORD", message: "nope" });
    const result = await clientWith(impl).signIn({ email: "a@b.c", password: "wrong1" });
    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_CREDENTIALS", message: "nope", status: 401 },
    });
  });

  it("maps duplicate email on sign-up", async () => {
    const { impl } = makeFetch(422, { code: "USER_ALREADY_EXISTS", message: "taken" });
    const result = await clientWith(impl).signUp({ name: "X", email: "a@b.c", password: "pw123456" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("returns null data for signed-out sessions", async () => {
    const { impl } = makeFetch(200, { user: null, session: null });
    const result = await clientWith(impl).getSession();
    expect(result).toEqual({ ok: true, data: null });
  });

  it("maps full session payloads", async () => {
    const { impl } = makeFetch(200, {
      user: { id: "u1", email: "a@b.c", name: "M", emailVerified: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z" },
      session: { id: "s1", userId: "u1", expiresAt: "2026-12-01T00:00:00Z", ipAddress: "1.2.3.4" },
    });
    const result = await clientWith(impl).getSession();
    expect(result.ok).toBe(true);
    if (result.ok && result.data) {
      expect(result.data.session.id).toBe("s1");
      expect(result.data.session.expiresAt).toBeInstanceOf(Date);
    }
  });

  it("returns NETWORK_ERROR when the request throws", async () => {
    const impl = async () => {
      throw new TypeError("fetch failed");
    };
    const client = clientWith(impl);
    const result = await client.getSession();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.status).toBe(0);
    }
  });

  it("currentUser resolves to null when signed out", async () => {
    const { impl } = makeFetch(200, { user: null, session: null });
    expect(await clientWith(impl).currentUser()).toBeNull();
  });

  it("sends verify-email token as query parameter", async () => {
    const { impl, calls } = makeFetch(200, {});
    await clientWith(impl).verifyEmail({ token: "tok123" });
    expect(calls[0]?.url).toContain("token=tok123");
  });

  it("signs out", async () => {
    const { impl } = makeFetch(200, { success: true });
    const result = await clientWith(impl).signOut();
    expect(result.ok).toBe(true);
  });

  it("exposes organization namespace only when enabled", async () => {
    const withOrg = createAuthClient({
      baseURL: "http://localhost:9999",
      organizationEnabled: true,
      fetchOptions: { customFetchImpl: makeFetch(200, {}).impl },
    });
    const withoutOrg = createAuthClient({
      baseURL: "http://localhost:9999",
      fetchOptions: { customFetchImpl: makeFetch(200, {}).impl },
    });
    expect(withOrg.organization).toBeDefined();
    expect(withoutOrg.organization).toBeUndefined();
  });
});

describe("normalizeClientError", () => {
  it("prefers known BA codes", () => {
    const error = normalizeClientError({ code: "USER_BANNED", message: "banned", status: 403 });
    expect(error.code).toBe("FORBIDDEN");
  });

  it("falls back by status then default", () => {
    expect(normalizeClientError({ message: "?", status: 500 }).code).toBe("VALIDATION_ERROR");
    expect(
      normalizeClientError({ message: "?", status: 500 }, { 500: "INVALID_SESSION" }).code,
    ).toBe("INVALID_SESSION");
  });

  it("handles non-object errors as network failures", () => {
    expect(normalizeClientError(undefined)).toEqual({
      code: "NETWORK_ERROR",
      message: "Request could not be completed",
      status: 0,
    });
  });

  it("never throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => normalizeClientError(Symbol("weird"))).not.toThrow();
  });
});
