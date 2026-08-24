import { getMigrations } from "better-auth/db/migration";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import type { BetterAuthPlugin } from "better-auth/types";
import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from "kysely";

function schemaOnlyPostgres(): Kysely<Record<string, never>> {
  return new Kysely({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
  });
}

export interface GenerateSchemaSqlOptions {
  organization?: boolean;
}

export async function generateSchemaSql(
  options: GenerateSchemaSqlOptions = {},
): Promise<string> {
  const plugins: BetterAuthPlugin[] = [admin()];
  if (options.organization) {
    plugins.push(organization({}));
  }
  const migrations = await getMigrations(
    {
      secret: "schema-generation-only".padEnd(32, "-"),
      baseURL: "http://localhost:3000",
      database: { db: schemaOnlyPostgres(), type: "postgres" as const },
      emailAndPassword: { enabled: true },
      plugins,
    },
    { throwOnUnsafe: false },
  );
  return migrations.compileMigrations();
}
