import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { runCli } from "../src/cli/run-cli";

const tempDirs: string[] = [];

async function tempFile(name: string) {
  const dir = await mkdtemp(join(tmpdir(), "auth-cli-"));
  tempDirs.push(dir);
  return join(dir, name);
}

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("runCli", () => {
  it("prints core DDL to stdout for generate", async () => {
    const lines: string[] = [];
    const code = await runCli(["generate"], (m) => lines.push(m));
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain('create table "user"');
    expect(lines.join("\n")).toContain('"role" text');
  });

  it("includes organization tables with --org", async () => {
    const lines: string[] = [];
    const code = await runCli(["generate", "--org"], (m) => lines.push(m));
    const output = lines.join("\n");
    expect(code).toBe(0);
    expect(output).toContain('create table "organization"');
    expect(output).toContain('create table "member"');
  });

  it("writes to --out file for init and prints next steps", async () => {
    const outPath = await tempFile("auth-schema.sql");
    const lines: string[] = [];
    const code = await runCli(["init", "--out", outPath], (m) => lines.push(m));
    expect(code).toBe(0);
    const contents = await readFile(outPath, "utf8");
    expect(contents).toContain('create table "session"');
    expect(lines.join("\n")).toContain(`Wrote schema artifact to ${outPath}`);
    expect(lines.join("\n")).toContain("Next steps:");
  });

  it("returns exit code 1 with usage when no command given", async () => {
    const lines: string[] = [];
    const code = await runCli([], (m) => lines.push(m));
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("Usage:");
  });

  it("rejects unknown commands", async () => {
    const lines: string[] = [];
    const code = await runCli(["explode"], (m) => lines.push(m));
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain('Unknown command "explode"');
  });
});
