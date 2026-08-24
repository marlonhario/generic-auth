import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  createAuthServer,
  generateSchemaSql,
  type AuthServerInstance,
} from "../src";
import { schema } from "./pg-schema";

/**
 * Organization-mode integration suite against real PostgreSQL.
 *
 * Requires a disposable database. Run with:
 *   AUTH_TEST_PG_URL=postgres://postgres:postgres@127.0.0.1:5544/auth_test pnpm test
 *
 * The schema is wiped and recreated from the CLI's generated DDL on every run,
 * which also exercises `generateSchemaSql` end-to-end.
 */
const pgUrl = process.env.AUTH_TEST_PG_URL;

describe.skipIf(!pgUrl)("integration: organization mode against PostgreSQL", () => {
  const url = pgUrl as string;
  const pool = new Pool({ connectionString: url });
  let server: AuthServerInstance;
  const BASE = "http://localhost:3000";

  beforeAll(async () => {
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    const ddl = await generateSchemaSql({ organization: true });
    for (const statement of ddl.split(";")) {
      const trimmed = statement.trim();
      if (trimmed.length > 0) await pool.query(trimmed);
    }

    server = createAuthServer({
      database: drizzle(url, { schema }),
      databaseProvider: "pg",
      schema,
      secret: "org-integration-test-secret-0123456789",
      baseURL: BASE,
      // With organization mode enabled the SAME access control backs the
      // organization plugin, so roles must also carry its statements
      // (invitation.create, member.*, organization.*) alongside app ones.
      roles: [
        {
          name: "owner",
          permissions: [
            "org.read",
            "org.write",
            "org.manage",
            "organization.update",
            "organization.delete",
            "member.create",
            "member.update",
            "member.delete",
            "invitation.create",
            "invitation.cancel",
          ],
        },
        { name: "admin", permissions: ["org.read", "org.write", "invitation.create", "member.invite"] },
        { name: "member", permissions: ["projects.read"] },
      ],
      admin: { defaultRole: "member" },
      organization: { enabled: true },
      email: { send: async () => {} },
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  function jsonRequest(
    path: string,
    body: unknown,
    cookie?: string,
  ): Request {
    return new Request(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  async function expectOk(
    response: Response,
    label: string,
  ): Promise<unknown> {
    if (!response.ok) {
      throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
    }
    return response.json();
  }

  async function signUp(email: string): Promise<string> {
    const response = await server.handler(
      jsonRequest("/api/auth/sign-up/email", {
        name: email.split("@")[0],
        email,
        password: "supersecret123",
      }),
    );
    await expectOk(response, "sign-up");
    return response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
  }

  it("organization plugin routes exist and are session-guarded", async () => {
    const response = await server.handler(
      new Request(`${BASE}/api/auth/organization/get-full-organization`),
    );
    expect(response.status).toBe(401);
  });

  it("create → invite → accept → membership flow end-to-end", async () => {
    const aliceCookie = await signUp("alice@example.com");
    const bobCookie = await signUp("bob@example.com");

    // Alice creates an organization and becomes its owner.
    const createResponse = await server.handler(
      jsonRequest(
        "/api/auth/organization/create",
        { name: "Acme", slug: "acme" },
        aliceCookie,
      ),
    );
    const organization = (await expectOk(createResponse, 'organization/create')) as { id?: string };
    expect(organization.id).toBeTruthy();
    const organizationId = organization.id as string;

    // Alice invites Bob as an org admin.
    const inviteResponse = await server.handler(
      jsonRequest(
        "/api/auth/organization/invite-member",
        { email: "bob@example.com", role: "admin", organizationId },
        aliceCookie,
      ),
    );
    const invitation = (await expectOk(inviteResponse, 'invite-member')) as { id?: string };
    expect(invitation.id).toBeTruthy();

    // Bob accepts the invitation.
    const acceptResponse = await server.handler(
      jsonRequest(
        "/api/auth/organization/accept-invitation",
        { invitationId: invitation.id },
        bobCookie,
      ),
    );
    await expectOk(acceptResponse, 'accept-invitation');

    // Full organization now contains both members with correct roles.
    const fullOrgResponse = await server.handler(
      new Request(`${BASE}/api/auth/organization/get-full-organization`, {
        headers: { cookie: aliceCookie },
      }),
    );
    expect(fullOrgResponse.ok).toBe(true);
    const fullOrg = (await fullOrgResponse.json()) as {
      members?: Array<{ role: string; user?: { email?: string } }>;
    };
    const rolesByEmail = new Map(
      (fullOrg.members ?? []).map((member) => [
        member.user?.email,
        member.role,
      ]),
    );
    expect(rolesByEmail.get("alice@example.com")).toBe("owner");
    expect(rolesByEmail.get("bob@example.com")).toBe("admin");
  });

  it("facade resolveContext still works alongside organization mode", async () => {
    const carolCookie = await signUp("carol@example.com");
    const context = await server.resolveContext({
      headers: new Headers({ cookie: carolCookie }),
    });
    expect(context.roles).toEqual(["member"]);
    expect(await context.can("projects.read")).toBe(true);
    expect(await context.can("users.read")).toBe(false); // not in any global role
  });
});
