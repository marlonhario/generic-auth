import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/env";

const validEnv = {
  AUTH_SECRET: "a".repeat(32),
  AUTH_BASE_URL: "https://api.example.com",
  DATABASE_URL: "postgres://localhost:5432/app",
};

describe("loadEnv", () => {
  it("accepts a valid environment", () => {
    const result = loadEnv(validEnv);
    expect(result.AUTH_SECRET).toBe("a".repeat(32));
    expect(result.AUTH_BASE_URL).toBe("https://api.example.com");
    expect(result.DATABASE_URL).toBe("postgres://localhost:5432/app");
    expect(result.AUTH_TRUSTED_ORIGINS).toBeUndefined();
  });

  it("rejects secrets shorter than 32 characters", () => {
    expect(() =>
      loadEnv({ ...validEnv, AUTH_SECRET: "short" }),
    ).toThrow(/AUTH_SECRET/);
  });

  it("rejects invalid base URLs and missing database URLs", () => {
    expect(() =>
      loadEnv({ ...validEnv, AUTH_BASE_URL: "not-a-url" }),
    ).toThrow();
    expect(() => loadEnv({ ...validEnv, DATABASE_URL: "" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("splits, trims, and drops empty trusted origins", () => {
    const result = loadEnv({
      ...validEnv,
      AUTH_TRUSTED_ORIGINS: "https://a.com , https://b.com ,, ",
    });
    expect(result.AUTH_TRUSTED_ORIGINS).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  it("omits trusted origins when blank", () => {
    const result = loadEnv({
      ...validEnv,
      AUTH_TRUSTED_ORIGINS: " , ",
    });
    expect(result.AUTH_TRUSTED_ORIGINS).toBeUndefined();
  });

  it("refuses http:// base URLs in production", () => {
    expect(() =>
      loadEnv({
        ...validEnv,
        AUTH_BASE_URL: "http://api.example.com",
        NODE_ENV: "production",
      }),
    ).toThrow(
      /AUTH_BASE_URL must use https:\/\/ in production/,
    );
  });

  it("accepts https:// base URLs in production", () => {
    const result = loadEnv({
      ...validEnv,
      NODE_ENV: "production",
    });
    expect(result.AUTH_BASE_URL).toBe("https://api.example.com");
  });

  it("allows http:// base URLs outside production", () => {
    const result = loadEnv({
      ...validEnv,
      AUTH_BASE_URL: "http://localhost:3000",
      NODE_ENV: "development",
    });
    expect(result.AUTH_BASE_URL).toBe("http://localhost:3000");
  });
});
