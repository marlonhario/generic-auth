import { writeFile } from "node:fs/promises";
import { generateSchemaSql } from "./schema";

const USAGE = `Usage:
  auth-cli init [--org] [--out <file>]     Write schema artifact and next steps
  auth-cli generate [--org] [--out <file>] Print/write PostgreSQL DDL for auth tables

Flags:
  --org        Include organization plugin tables
  --out <file> Write DDL to file instead of stdout`;

interface ParsedArgs {
  command?: string;
  flags: Set<string>;
  outPath?: string;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const parsed: ParsedArgs = { flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === "--out") {
      const value = argv[i + 1];
      if (typeof value === "string") {
        parsed.outPath = value;
        i++;
      }
    } else if (arg.startsWith("--")) {
      parsed.flags.add(arg);
    } else {
      parsed.command ??= arg;
    }
  }
  return parsed;
}

async function emitDdl(parsed: ParsedArgs, log: (message: string) => void) {
  const sql = await generateSchemaSql({
    organization: parsed.flags.has("--org"),
  });
  if (parsed.outPath) {
    await writeFile(parsed.outPath, `${sql}\n`, "utf8");
    log(`Wrote schema artifact to ${parsed.outPath}`);
    return;
  }
  log(sql);
}

export async function runCli(
  argv: readonly string[],
  log: (message: string) => void = console.log,
): Promise<number> {
  const parsed = parseArgs(argv);

  switch (parsed.command) {
    case "generate":
      await emitDdl(parsed, log);
      return 0;
    case "init":
      if (!parsed.outPath) {
        parsed.outPath = "auth-schema.sql";
      }
      await emitDdl(parsed, log);
      log(
        [
          "",
          "Next steps:",
          "1. Review the generated DDL artifact.",
          "2. Apply it with your own migration tooling (drizzle-kit, psql, etc.).",
          "   The library never applies migrations to your database.",
          "3. See ADR-0004 in the library docs for details.",
        ].join("\n"),
      );
      return 0;
    case undefined:
      log(USAGE);
      return 1;
    default:
      log(`Unknown command "${parsed.command}".\n\n${USAGE}`);
      return 1;
  }
}
