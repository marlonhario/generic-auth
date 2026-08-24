import { describe, expect, it } from "vitest";
import { parsePermissionString, toStatement, toStatements } from "../src/permissions";

describe("parsePermissionString", () => {
  it("parses resource and action", () => {
    expect(parsePermissionString("users.read")).toEqual({
      resource: "users",
      action: "read",
    });
  });

  it("splits on the first dot only", () => {
    expect(parsePermissionString("reports.monthly.export")).toEqual({
      resource: "reports",
      action: "monthly.export",
    });
  });

  it.each(["users.", ".read", "users", "", ".", "a..b"])(
    "rejects malformed input %j",
    (input) => {
      expect(() => parsePermissionString(input as never)).toThrow(
        /Invalid permission/,
      );
    },
  );
});

describe("toStatement", () => {
  it("converts a single permission to Better Auth statement shape", () => {
    expect(toStatement("project.create")).toEqual({ project: ["create"] });
  });
});

describe("toStatements", () => {
  it("converts multiple permissions", () => {
    expect(toStatements(["users.read", "users.update", "reports.read"])).toEqual([
      { users: ["read"] },
      { users: ["update"] },
      { reports: ["read"] },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(toStatements([])).toEqual([]);
  });

  it("throws when any entry is malformed", () => {
    expect(() => toStatements(["users.read", "broken" as never])).toThrow(
      /Invalid permission/,
    );
  });
});
