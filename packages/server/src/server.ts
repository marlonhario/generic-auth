import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import {
  AuthError,
  toStatement,
  type AuthContext,
  type PermissionString,
  type RoleConfig,
  type RoleName,
} from "@marlonoirah/auth-core";
import { buildAccessControl } from "./access-control";
import type { EmailSender, RateLimiter, ServerHooks } from "./interfaces";

export type DrizzleDatabase = Parameters<typeof drizzleAdapter>[0];

type BaOptions = NonNullable<Parameters<typeof betterAuth>[0]>;

/** Verbatim Better Auth session options (expiresIn, updateAge, cookieCache, …). */
export type SessionOptions = NonNullable<BaOptions["session"]>;

/** Cookie/origin-related subset of Better Auth's advanced options. */
export type AdvancedOptions = Pick<
  NonNullable<BaOptions["advanced"]>,
  | "useSecureCookies"
  | "defaultCookieAttributes"
  | "cookiePrefix"
  | "disableOriginCheck"
>;

type BaDatabaseOption = Parameters<typeof betterAuth>[0]["database"];

export interface CreateAuthServerOptions {
  /**
   * Primary path: a Drizzle instance. Wrapped with drizzleAdapter automatically
   * (ADR-0003). Required unless `databaseAdapter` is provided.
   */
  database?: DrizzleDatabase;
  /**
   * Drizzle table definitions forwarded to drizzleAdapter as `schema`.
   * Strongly recommended in production: Better Auth maps models by name
   * instead of relying on database introspection.
   */
  schema?: NonNullable<Parameters<typeof drizzleAdapter>[1]>["schema"];
  /**
   * Escape hatch: a native Better Auth `database` option (e.g. `memoryAdapter()`
   * in tests). Takes precedence over `database`; exactly one must be provided.
   */
  databaseAdapter?: BaDatabaseOption;
  databaseProvider?: "pg" | "mysql" | "sqlite";
  secret: string;
  baseURL: string;
  trustedOrigins?: string[];
  roles: RoleConfig;
  organization?: { enabled: boolean };
  /** Options forwarded to the always-wired Better Auth admin plugin. */
  admin?: {
    /** Role assigned to newly created users. */
    defaultRole?: string;
    /** Roles allowed to administer other users. */
    adminRoles?: string[];
  };
  plugins?: Parameters<typeof betterAuth>[0]["plugins"];
  /** Better Auth session options, passed through verbatim. */
  session?: SessionOptions;
  /** Cookie controls (Secure/SameSite/prefix) from Better Auth's advanced options. */
  advanced?: AdvancedOptions;
  email: EmailSender;
  rateLimiter?: RateLimiter;
  hooks?: ServerHooks;
}

export interface AuthRequest {
  /** Standard Headers, or a plain object as provided by Fastify/Express-style frameworks. */
  headers: Headers | Record<string, string | string[] | undefined>;
}

function toWebHeaders(headers: AuthRequest["headers"]): Headers {
  if (headers instanceof Headers) return headers;
  const web = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) web.append(key, entry);
    } else if (value !== undefined) {
      web.set(key, value);
    }
  }
  return web;
}

type SessionPayload = Awaited<ReturnType<ReturnType<typeof betterAuth>["api"]["getSession"]>>;

function parseUserRoles(payload: SessionPayload): RoleName[] {
  const role = (payload?.user as Record<string, unknown> | undefined)?.role;
  if (typeof role !== "string" || role.length === 0) {
    return [];
  }
  return role.split(",").map((entry) => entry.trim());
}

export function createAuthServer(options: CreateAuthServerOptions) {
  if (!options.database && !options.databaseAdapter) {
    throw new AuthError(
      "CONFIGURATION",
      "createAuthServer: provide either `database` (Drizzle instance) or `databaseAdapter` (native Better Auth database)",
    );
  }
  if (options.database && options.databaseAdapter) {
    throw new AuthError(
      "CONFIGURATION",
      "createAuthServer: provide only one of `database` or `databaseAdapter`, not both",
    );
  }
  const built = buildAccessControl(options.roles);
  const roles = built.roles;

  const plugins: NonNullable<CreateAuthServerOptions["plugins"]> = [
    admin({
      ac: built.ac,
      roles,
      ...(options.admin?.defaultRole !== undefined
        ? { defaultRole: options.admin.defaultRole }
        : {}),
      ...(options.admin?.adminRoles !== undefined
        ? { adminRoles: options.admin.adminRoles }
        : {}),
    }),
    ...(options.plugins ?? []),
  ];
  if (options.organization?.enabled) {
    plugins.push(organization({ ac: built.ac, roles }));
  }

  const auth = betterAuth({
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins,
    ...(options.session ? { session: options.session } : {}),
    ...(options.advanced ? { advanced: options.advanced } : {}),
    database:
      options.databaseAdapter ??
      drizzleAdapter(options.database as DrizzleDatabase, {
        provider: options.databaseProvider ?? "pg",
        ...(options.schema ? { schema: options.schema } : {}),
      }),
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        await options.email.send({
          to: user.email,
          subject: "Reset your password",
          html: `<p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await options.email.send({
          to: user.email,
          subject: "Verify your email",
          html: `<p>Click the link below to verify your email:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    },
    databaseHooks: options.hooks?.onUserCreated
      ? {
          user: {
            create: {
              after: async (user) => {
                await options.hooks?.onUserCreated?.(
                  user as unknown as AuthContext["user"],
                );
              },
            },
          },
        }
      : undefined,
    plugins,
  });

  function authorize(rolesToCheck: RoleName[], permission: PermissionString): boolean {
    const statement = toStatement(permission);
    return rolesToCheck.some((role) => {
      const definition = roles[role];
      return definition?.authorize(statement as never).success ?? false;
    });
  }

  async function resolveContext(request: AuthRequest): Promise<AuthContext> {
    const payload = await auth.api.getSession({ headers: toWebHeaders(request.headers) });
    if (!payload?.session || !payload?.user) {
      throw new AuthError("INVALID_SESSION");
    }
    const userRoles = parseUserRoles(payload);
    return {
      user: payload.user as unknown as AuthContext["user"],
      session: payload.session as unknown as AuthContext["session"],
      roles: userRoles,
      can: async (permission) => authorize(userRoles, permission),
      hasRole: (role) => userRoles.includes(role),
      hasAnyRole: (candidates) => candidates.some((role) => userRoles.includes(role)),
    };
  }

  async function requirePermission(
    request: AuthRequest,
    permission: PermissionString,
  ): Promise<void> {
    const context = await resolveContext(request);
    if (!(await context.can(permission))) {
      throw new AuthError("INSUFFICIENT_PERMISSIONS", `Missing permission "${permission}"`);
    }
  }

  async function requireAnyPermission(
    request: AuthRequest,
    permissions: readonly PermissionString[],
  ): Promise<void> {
    const context = await resolveContext(request);
    const results = await Promise.all(permissions.map((permission) => context.can(permission)));
    if (!results.some(Boolean)) {
      throw new AuthError(
        "INSUFFICIENT_PERMISSIONS",
        `Missing any of permissions: ${permissions.join(", ")}`,
      );
    }
  }

  return {
    auth,
    handler: auth.handler,
    rateLimiter: options.rateLimiter,
    resolveContext,
    requirePermission,
    requireAnyPermission,
    hasRole: (request: AuthRequest, role: RoleName) =>
      resolveContext(request).then((context) => context.hasRole(role)),
    hasAnyRole: (request: AuthRequest, candidates: readonly RoleName[]) =>
      resolveContext(request).then((context) => context.hasAnyRole(candidates)),
  };
}

export type AuthServerInstance = ReturnType<typeof createAuthServer>;
