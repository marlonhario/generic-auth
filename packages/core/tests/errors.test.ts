import { describe, expect, it } from "vitest";
import { AuthError, errorCodeToStatus, isAuthErrorCode } from "../src/errors";

describe("AuthError", () => {
  it("carries the mapped HTTP status", () => {
    expect(new AuthError("INVALID_CREDENTIALS").status).toBe(401);
    expect(new AuthError("RATE_LIMITED").status).toBe(429);
    expect(new AuthError("INSUFFICIENT_PERMISSIONS").status).toBe(403);
  });

  it("defaults the message to the code and allows overrides", () => {
    expect(new AuthError("FORBIDDEN").message).toBe("FORBIDDEN");
    expect(new AuthError("FORBIDDEN", "No access").message).toBe("No access");
  });

  it("is an Error with a stable name", () => {
    const error = new AuthError("SESSION_EXPIRED");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AuthError");
    expect(error.code).toBe("SESSION_EXPIRED");
  });
});

describe("errorCodeToStatus / isAuthErrorCode", () => {
  it("maps every code to a valid HTTP status", () => {
    for (const [code, status] of Object.entries(errorCodeToStatus)) {
      expect(Number.isInteger(status)).toBe(true);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThanOrEqual(599);
      expect(isAuthErrorCode(code)).toBe(true);
    }
  });

  it("rejects unknown codes", () => {
    expect(isAuthErrorCode("NOT_A_CODE")).toBe(false);
  });
});
