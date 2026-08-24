import { describe, expect, it } from "vitest";
import {
  forgotPasswordInputSchema,
  loginInputSchema,
  permissionStringSchema,
  registerInputSchema,
  resetPasswordInputSchema,
} from "../src/validation";

describe("loginInputSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginInputSchema.safeParse({
      email: "user@example.com",
      password: "hunter22222",
    });
    expect(result.success).toBe(true);
  });

  it("strips unknown keys", () => {
    const result = loginInputSchema.parse({
      email: "user@example.com",
      password: "x",
      role: "admin",
    });
    expect(result).toEqual({ email: "user@example.com", password: "x" });
  });

  it("rejects invalid email or empty password", () => {
    expect(
      loginInputSchema.safeParse({ email: "nope", password: "x" }).success,
    ).toBe(false);
    expect(
      loginInputSchema.safeParse({ email: "user@example.com", password: "" })
        .success,
    ).toBe(false);
  });
});

describe("registerInputSchema", () => {
  it("accepts a valid registration", () => {
    expect(
      registerInputSchema.safeParse({
        name: "Marlon",
        email: "user@example.com",
        password: "correcthorse",
      }).success,
    ).toBe(true);
  });

  it("rejects short passwords", () => {
    expect(
      registerInputSchema.safeParse({
        name: "Marlon",
        email: "user@example.com",
        password: "short",
      }).success,
    ).toBe(false);
  });

  it("rejects passwords over 128 characters", () => {
    expect(
      registerInputSchema.safeParse({
        name: "Marlon",
        email: "user@example.com",
        password: "a".repeat(129),
      }).success,
    ).toBe(false);
  });

  it("rejects blank names", () => {
    expect(
      registerInputSchema.safeParse({
        name: "   ",
        email: "user@example.com",
        password: "correcthorse",
      }).success,
    ).toBe(false);
  });
});

describe("forgotPasswordInputSchema / resetPasswordInputSchema", () => {
  it("validates email-only reset request", () => {
    expect(
      forgotPasswordInputSchema.safeParse({ email: "user@example.com" })
        .success,
    ).toBe(true);
    expect(forgotPasswordInputSchema.safeParse({ email: "bad" }).success).toBe(
      false,
    );
  });

  it("requires token and newPassword", () => {
    expect(
      resetPasswordInputSchema.safeParse({
        token: "abc",
        newPassword: "correcthorse",
      }).success,
    ).toBe(true);
    expect(
      resetPasswordInputSchema.safeParse({ token: "", newPassword: "correcthorse" })
        .success,
    ).toBe(false);
    expect(
      resetPasswordInputSchema.safeParse({ token: "abc", newPassword: "short" })
        .success,
    ).toBe(false);
  });
});

describe("permissionStringSchema", () => {
  it("accepts resource.action strings", () => {
    const result = permissionStringSchema.parse("users.read");
    expect(result).toBe("users.read");
  });

  it("rejects strings without a dot or with whitespace", () => {
    expect(permissionStringSchema.safeParse("users").success).toBe(false);
    expect(permissionStringSchema.safeParse("users read").success).toBe(false);
  });
});
