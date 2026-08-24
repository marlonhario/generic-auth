import { loadEnv, createAuthServer, fastifyAuthPlugin } from "@marlonoirah/auth-server";
import { drizzle } from "drizzle-orm/node-postgres";
import Fastify from "fastify";
import { roles } from "./roles";
import { emailSender } from "./email";

// Fail fast if the environment is misconfigured.
const env = loadEnv();

export const authServer = createAuthServer({
  // Drizzle + PostgreSQL is the primary path (ADR-0003).
  database: drizzle(env.DATABASE_URL),
  secret: env.AUTH_SECRET,
  baseURL: env.AUTH_BASE_URL,
  ...(env.AUTH_TRUSTED_ORIGINS
    ? { trustedOrigins: env.AUTH_TRUSTED_ORIGINS }
    : {}),
  roles,
  admin: { defaultRole: "member" },
  email: emailSender,
});

export function buildApp() {
  const app = Fastify({ logger: true });

  // Mounts Better Auth's native routes at /api/auth/*.
  app.register(fastifyAuthPlugin, { auth: authServer });

  // Route-level authorization — the backend is the security boundary.
  app.get("/admin/stats", async (request) => {
    await authServer.requirePermission(request, "users.read");
    return { secret: "only for users.read holders" };
  });

  app.get("/me", async (request) => {
    const ctx = await authServer.resolveContext(request);
    return {
      user: ctx.user.email,
      roles: ctx.roles,
      canEditProjects: await ctx.can("projects.write"),
    };
  });

  return app;
}

if (process.env.RUN_SERVER === "1") {
  buildApp().listen({ port: 3000 });
}
