# Public API Contracts

Status definitions per package. These sketches are the implementation target for Phase 1–4.
Anything not listed here is **internal** and must not be imported by consuming applications.
Changes to these surfaces require changesets + review; breaking changes require an ADR.

---

## `@marlonoirah/auth-core`

Zero runtime dependencies except `zod`. No I/O, no framework, no DB.

```ts
// ---- Entities ----
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionInfo {
  id: string;
  userId: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export type RoleName = string;

// ---- Permissions ----
/** Developer-facing sugar only (ADR-0006). Never a security format. */
export type PermissionString = `${string}.${string}`;
/** Better Auth statement shape — the actual authorization format. */
export interface StatementMap {
  [resource: string]: readonly string[];
}

export const parsePermissionString: (p: PermissionString) => { resource: string; action: string };
export const toStatement: (p: PermissionString) => StatementMap;
export const toStatements: (permissions: readonly PermissionString[]) => StatementMap[];

// ---- Roles (config-defined in v1; see ADR-0001) ----
export interface RoleDefinition {
  name: RoleName;
  permissions: readonly PermissionString[];
  description?: string;
}
export type RoleConfig = readonly RoleDefinition[] | Record<RoleName, readonly PermissionString[]>;

// ---- Tenancy (optional; only meaningful when organization plugin enabled) ----
export interface Membership {
  id: string;
  organizationId: string;
  role: RoleName;
}
export interface OrganizationRef {
  id: string;
  name: string;
  slug: string;
}

// ---- Authorization context ----
export interface AuthContext {
  user: User;
  session: SessionInfo;
  roles: RoleName[];
  /** Resolved permission check delegating to Better Auth (server-side only). */
  can: (permission: PermissionString) => Promise<boolean>;
  hasRole: (role: RoleName) => boolean;
  hasAnyRole: (roles: RoleName[]) => boolean;
  organization?: OrganizationRef;
  membership?: Membership;
}

// ---- Errors ----
/** Stable, machine-readable codes. Part of the public contract (semver-governed). */
export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "EMAIL_ALREADY_EXISTS"
  | "EMAIL_NOT_VERIFIED"
  | "SESSION_EXPIRED"
  | "INVALID_SESSION"
  | "INVALID_RESET_TOKEN"
  | "EXPIRED_RESET_TOKEN"
  | "OAUTH_ERROR"
  | "RATE_LIMITED"
  | "FORBIDDEN"
  | "INSUFFICIENT_PERMISSIONS"
  | "ROLE_NOT_FOUND"
  | "PERMISSION_NOT_FOUND"
  | "ORGANIZATION_REQUIRED"
  | "VALIDATION_ERROR";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status: number; // mapped HTTP status
  constructor(code: AuthErrorCode, message?: string);
}
export const errorCodeToStatus: Record<AuthErrorCode, number>;

// ---- Validation (zod) ----
export const loginInputSchema: z.ZodType<{ email: string; password: string; rememberMe?: boolean }>;
export const registerInputSchema: z.ZodType<{ name: string; email: string; password: string }>;
export const forgotPasswordInputSchema: z.ZodType<{ email: string }>;
export const resetPasswordInputSchema: z.ZodType<{ token: string; newPassword: string }>;
```

---

## `@marlonoirah/auth-server`

Depends on: `better-auth@1.7.1` (exact, ADR-0005), `drizzle-orm`, `@marlonoirah/auth-core`.
Never depends on React or frontend frameworks.

```ts
// ---- Factory ----
export interface CreateAuthServerOptions {
  database: DrizzleDatabase | ConnectionConfig;   // ADR-0003
  secret: string;
  baseURL: string;
  trustedOrigins?: string[];
  /** App-defined roles/permissions — config-defined in v1 (ADR-0001). */
  roles: RoleConfig;
  /** Optional tenancy via Better Auth Organization plugin. Off by default. */
  organization?: { enabled: false } | { enabled: true; ac?: AccessControlOptions };
  /** Additional Better Auth plugins (twoFactor, passkey, ...). */
  plugins?: BetterAuthPlugin[];
  email: EmailSender;                              // required for verification/reset flows
  rateLimiter?: RateLimiter;                       // pluggable; default: in-memory
  hooks?: ServerHooks;
  session?: Partial<SessionOptions>;
}

export interface EmailSender {
  send(input: { to: string; subject: string; html: string; text?: string }): Promise<void>;
}
export interface RateLimiter {
  limit(key: string): Promise<{ success: boolean; retryAfterSeconds?: number }>;
}
export interface ServerHooks {
  onUserCreated?(user: User): Promise<void>;
  onLoginSuccess?(ctx: { userId: string }): Promise<void>;
  onLoginFailed?(ctx: { email: string; reason: string }): Promise<void>;
  onRoleAssigned?(ctx: { userId: string; role: RoleName }): Promise<void>;
  onOrganizationInvitation?(ctx: { organizationId: string; email: string }): Promise<void>;
}

export function createAuthServer(options: CreateAuthServerOptions): AuthServerInstance;

export interface AuthServerInstance {
  /** Better Auth handler — mount at any route prefix via an adapter. */
  handler: RequestHandler;
  /** Framework-neutral context resolver. */
  resolveContext(req: FrameworkAgnosticRequest): Promise<AuthContext>;
  /** Delegating authorization helpers (ADR-0006). */
  can(ctx: AuthContext, permission: PermissionString): Promise<boolean>;
  hasRole(ctx: AuthContext, role: RoleName): boolean;
  hasAnyRole(ctx: AuthContext, roles: RoleName[]): boolean;
  /** Require helpers — throw AuthError("INSUFFICIENT_PERMISSIONS"|"FORBIDDEN"). */
  requirePermission(ctx: AuthContext, permission: PermissionString): Promise<void>;
  requireAnyPermission(ctx: AuthContext, permissions: PermissionString[]): Promise<void>;
  client: typeof authClientTypes; // inferred BA server API passthrough
}

// ---- Adapters (thin wrappers over resolveContext/require*) ----
export function fastifyAuthPlugin(instance: AuthServerInstance): FastifyPluginAsync; // authenticate/authorize decorators
export function createTrpcMiddleware(instance: AuthServerInstance): TrpcMiddlewareFactory;

// ---- CLI (ADR-0004) ----
// auth-cli init | generate
export function runCli(args: string[]): Promise<number>;

// ---- Env validation ----
export function loadEnv(source?: Record<string, string>): Required<EnvContract>;
export interface EnvContract {
  AUTH_SECRET: string;
  AUTH_BASE_URL: string;
  DATABASE_URL: string;
  AUTH_TRUSTED_ORIGINS?: string[]; // comma-separated
}
```

### HTTP surface

Routes are **Better Auth's native routes** under the mount prefix (e.g. `/api/auth/sign-in/email`,
`/sign-up/email`, `/get-session`, `/change-password`, `/verify-email`, `/forget-password`,
`/reset-password`, organization routes when enabled). There is no custom `/auth/login`,
`/register`, or `/refresh` endpoint; sessions are cookie-token based. The library adds no
global role-CRUD endpoints (ADR-0001).

---

## `@marlonoirah/auth-client`

Depends on: `better-auth/client` re-exports + `@marlonoirah/auth-core`. Framework-free.

```ts
export interface CreateAuthClientOptions {
  baseURL: string;
  fetchOptions?: RequestInit;
  organizationEnabled?: boolean;
}

export function createAuthClient(options: CreateAuthClientOptions): AuthClient;

export interface AuthClient {
  signIn: (input: LoginInput) => Promise<ClientResult<{ user: User }>>;
  signUp: (input: RegisterInput) => Promise<ClientResult<{ user: User }>>;
  signOut: () => Promise<ClientResult<void>>;
  getSession: () => Promise<ClientResult<{ user: User; session: SessionInfo }>>;
  currentUser: () => Promise<User | null>;
  forgetPassword: (input: ForgotPasswordInput) => Promise<ClientResult<void>>;
  resetPassword: (input: ResetPasswordInput) => Promise<ClientResult<void>>;
  verifyEmail: (input: { token: string }) => Promise<ClientResult<void>>;
  // Available when organizationEnabled:
  organization?: OrganizationClientApi;
}

export type ClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: AuthErrorCode | "NETWORK_ERROR"; message: string; status: number } };
```

---

## `@marlonoirah/auth-react`

Depends on: `react`, `@marlonoirah/auth-client`, `@marlonoirah/auth-core`.

```tsx
// ---- Provider ----
export function AuthProvider(props: {
  client: AuthClient;
  children: ReactNode;
}): JSX.Element;

// ---- Hooks ----
export function useSession(): { user: User | null; session: SessionInfo | null; loading: boolean };
export function useAuthContext(): AuthClient;
export function useRoles(): RoleName[];
export function useRole(role: RoleName): boolean;
export function usePermissions(): { can(permission: PermissionString): boolean };
export function usePermission(permission: PermissionString): boolean;

// ---- Guards (client-side UX layer ONLY — backend remains the boundary) ----
export function AuthGuard(props: {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}): JSX.Element;
export function RequirePermission(props: {
  permission: PermissionString;
  children: ReactNode;
  fallback?: ReactNode;
}): JSX.Element;
export function RequireRole(props: {
  role: RoleName;
  children: ReactNode;
  fallback?: ReactNode;
}): JSX.Element;
export function RequirePermissions(props: {
  permissions: PermissionString[];
  mode?: "all" | "any";
  children: ReactNode;
  fallback?: ReactNode;
}): JSX.Element;

// ---- Headless forms (render props; WAI-ARIA-correct markup emitted by consumer) ----
export interface FormRenderProps<F> {
  fields: F;
  submit: () => Promise<void>;
  loading: boolean;
  error: { code: AuthErrorCode | "NETWORK_ERROR"; message: string } | null;
}
export function LoginForm(props: {
  children: (p: FormRenderProps<{ email: FieldApi; password: FieldApi }>) => ReactNode;
}): JSX.Element;
export function RegisterForm(props: { children: RenderChildren<FormRenderProps<RegisterFields>> }): JSX.Element;
export function ForgotPasswordForm(props: { children: RenderChildren<FormRenderProps<{ email: FieldApi }>> }): JSX.Element;
export function ResetPasswordForm(props: { children: RenderChildren<FormRenderProps<ResetFields>> }): JSX.Element;

// ---- RSC / server helpers (separate entry point: @marlonoirah/auth-react/server) ----
export function getServerSession(): Promise<{ user: User; session: SessionInfo } | null>;
export function requireServerSession(): Promise<{ user: User; session: SessionInfo }>; // redirects if absent
```

---

## Implemented deviations (authoritative as of Phase 5)

The sketches above are design intent. Where the implementation differs, **this
section wins**. All items are verified by the test suites (88 tests, all green).

### auth-core

- `User` carries optional admin-plugin fields: `role?: string | null`
  (comma-separated), `banned?: boolean | null`, `banReason?: string | null`.
- `AuthErrorCode` includes `"CONFIGURATION"` (HTTP 500) — misconfiguration
  signals from server/react-server helpers.
- `verifyEmailInputSchema` / `VerifyEmailInput` exist alongside the other input schemas.

### auth-server

- `AuthServerInstance` exposes `auth` (the full inferred Better Auth instance)
  and `handler`; there is no `client` field.
- Authorization helpers take an `AuthRequest = { headers: Headers }` (not a
  resolved `AuthContext`) and resolve internally:
  `resolveContext(req)`, `requirePermission(req, p)`,
  `requireAnyPermission(req, ps)`, `hasRole(req, role)`, `hasAnyRole(req, rs)`.
  Plain header objects (Fastify/Express style
  `Record<string, string | string[] | undefined>`) are accepted and normalized.
- `CreateAuthServerOptions.database` is optional; exactly one of
  `database` (Drizzle instance → wrapped with `drizzleAdapter`) or
  `databaseAdapter` (native BA database option, e.g. `memoryAdapter()` for
  tests) must be provided. Violations throw `CONFIGURATION`.
- New option `admin?: { defaultRole?: string; adminRoles?: string[] }`
  forwarded to the always-wired admin plugin.
- **Organization mode shares one AccessControl.** The same `roles` config backs
  both the admin and organization plugins. When `organization.enabled` is
  `true`, at least one global role must therefore carry the organization
  plugin's own statements (`invitation.create`, `member.update`,
  `organization.update`, …) or privileged organization routes will reject with
  `FORBIDDEN`. Verified by the PostgreSQL integration suite
  (`packages/server/tests/integration-org.test.ts`, gated behind
  `AUTH_TEST_PG_URL`).
- New option `schema?` forwarding Drizzle table definitions to
  `drizzleAdapter({ schema })`. Strongly recommended in production — Better
  Auth maps models by name instead of relying on database introspection.
- **ServerHooks — only `onUserCreated` is implemented.** The remaining hooks
  sketched above (`onLoginSuccess`, `onLoginFailed`, `onRoleAssigned`,
  `onOrganizationInvitation`) are **future work**: they remain declared in the
  `ServerHooks` interface but are currently ignored by `createAuthServer`.
  They will be wired via Better Auth database hooks in a later minor release.
- **Rate limiting — no built-in implementation in v1.** `rateLimiter?` remains
  an extension point: pass any `{ limit(key) }` implementation and the Fastify
  adapter will consult it per request (429 on failure). Without one, Better
  Auth's own built-in rate limiter remains active with its defaults. A bundled
  default implementation was deliberately deferred to keep v1 dependency-free.
- **Session & cookie options are restored** as verbatim passthroughs (the
  original sketch's silent omission is fixed): `session?:` accepts Better
  Auth's own session options type (`expiresIn`, `updateAge`, `cookieCache`,
  …) unchanged, and `advanced?:` exposes the cookie/origin subset
  (`useSecureCookies`, `defaultCookieAttributes`, `cookiePrefix`,
  `disableOriginCheck`). No translation layer — types come straight from the
  pinned Better Auth, so upgrades surface breaking changes at compile time.
- **⚠️ Better Auth disables origin checks when `NODE_ENV=test`.**
  `skipOriginCheck: isTest() ? true : false` — CSRF protection is a no-op in
  test environments unless `advanced: { disableOriginCheck: false }` is set
  explicitly. Production is unaffected. Verified by the integration suite.
- Server route rename in BA 1.7.x: password reset request lives at
  `/api/auth/request-password-reset` (NOT `/forget-password`).

### auth-client

- Wrapper method names keep the contract (`forgetPassword`), but they call
  Better Auth's renamed `requestPasswordReset` internally.
- `getSession(options?: { headers?: Headers })` accepts request headers for
  RSC/server usage (forwarded via `fetchOptions.headers`).
- Signed-out sessions return `{ ok: true, data: null }` (BA returns a 200 with
  null payload rather than an error).
- Network failures surface as `{ ok: false, error: { code: "NETWORK_ERROR",
  status: 0 } }`; thrown fetch errors are caught at the wrapper boundary.

### auth-react

- `AuthProvider` accepts `roles?: Record<RoleName, readonly PermissionString[]>`
  — pass the same RoleConfig given to `createAuthServer`. Client-side
  permission checks are pure set-membership over this map (UX layer only,
  ADR-0001/0006); nothing is enforced client-side.
- Form render props: `submit(): Promise<ClientResult<unknown>>` (returns the
  full result so apps can redirect on success); fields expose
  `{ name, value, onChange }`. A `VerifyEmailForm` exists in addition to the
  sketched forms.
- Guards render `fallback` while the session is loading (there is no separate
  `loading` prop).
- `/server` entry requires one-time bootstrap:
  `configureServerAuth({ headersProvider })` (e.g. `() => headers()` in Next.js
  RSC). `requireServerSession` throws `AuthError("INVALID_SESSION")` instead of
  redirecting (framework-free).
- Hooks: `usePermissions()` provides `can/canAny/canAll`;
  `useAuthContext()` returns the full provider state (client + session state),
  not just the raw client.

### Testing

- Integration coverage runs a real Better Auth instance against
  `@better-auth/memory-adapter` through the facade: sign-up → cookie →
  get-session → resolveContext/requirePermission → EmailSender port. No
  external database required.
