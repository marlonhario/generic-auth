import { describe, expect, it } from "vitest";
import { buildAccessControl, normalizeRoleConfig } from "../src/access-control";

describe("normalizeRoleConfig", () => {
  it("passes arrays through", () => {
    const config = [{ name: "admin", permissions: ["users.read" as const] }];
    expect(normalizeRoleConfig(config)).toEqual(config);
  });

  it("converts record form to definitions", () => {
    expect(
      normalizeRoleConfig({ admin: ["users.read"], viewer: ["reports.read"] }),
    ).toEqual([
      { name: "admin", permissions: ["users.read"] },
      { name: "viewer", permissions: ["reports.read"] },
    ]);
  });

  it("returns empty array for empty record", () => {
    expect(normalizeRoleConfig({})).toEqual([]);
  });
});

describe("buildAccessControl", () => {
  it("builds roles whose authorize() evaluates grouped statements", () => {
    const { roles } = buildAccessControl([
      {
        name: "manager",
        permissions: ["users.read", "users.update", "reports.read"],
      },
      { name: "viewer", permissions: ["reports.read"] },
    ]);

    const manager = roles["manager"];
    const viewer = roles["viewer"];

    expect(manager?.authorize({ users: ["update"] }).success).toBe(true);
    expect(manager?.authorize({ users: ["delete"] }).success).toBe(false);
    expect(viewer?.authorize({ reports: ["read"] }).success).toBe(true);
    expect(viewer?.authorize({ users: ["read"] }).success).toBe(false);
  });

  it("keeps roles independent — no cross-role leakage", () => {
    const { roles } = buildAccessControl([
      { name: "reader", permissions: ["users.read"] },
      { name: "editor", permissions: ["users.update"] },
    ]);

    expect(roles["reader"]?.authorize({ users: ["update"] }).success).toBe(
      false,
    );
    expect(roles["editor"]?.authorize({ users: ["update"] }).success).toBe(
      true,
    );
  });

  it("deduplicates repeated actions within one resource", () => {
    const { roles } = buildAccessControl([
      { name: "dup", permissions: ["users.read", "users.read"] },
    ]);
    expect(roles["dup"]?.authorize({ users: ["read"] }).success).toBe(true);
  });

  it("handles an empty role config", () => {
    const { roles } = buildAccessControl({});
    expect(Object.keys(roles)).toHaveLength(0);
  });

  it("throws on malformed permission strings", () => {
    expect(() =>
      buildAccessControl([{ name: "bad", permissions: ["usersread" as never] }]),
    ).toThrow(/Invalid permission/);
  });
});
