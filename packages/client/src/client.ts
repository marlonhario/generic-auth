import { createAuthClient as createBetterAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import type {
  ForgotPasswordInput,
  LoginInput,
  OrganizationRef,
  RegisterInput,
  ResetPasswordInput,
  SessionInfo,
  User,
} from "@marlonoirah/auth-core";
import { toResult, type ClientResult } from "./result";

export interface CreateAuthClientOptions {
  baseURL: string;
  fetchOptions?: RequestInit;
  organizationEnabled?: boolean;
}

export interface OrganizationClientApi {
  list: () => Promise<ClientResult<OrganizationRef[]>>;
  setActive: (organizationIdOrSlug: string) => Promise<ClientResult<unknown>>;
  create: (input: { name: string; slug: string }) => Promise<ClientResult<OrganizationRef>>;
  inviteMember: (input: {
    email: string;
    organizationId: string;
    role: string;
  }) => Promise<ClientResult<unknown>>;
  acceptInvitation: (invitationId: string) => Promise<ClientResult<unknown>>;
}

interface BaUser extends Record<string, unknown> {
  id: string;
  name?: string;
  email?: string;
  emailVerified?: boolean;
  image?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

function mapUser(user: BaUser): User {
  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
    emailVerified: user.emailVerified ?? false,
    image: user.image ?? null,
    createdAt: new Date(user.createdAt ?? Date.now()),
    updatedAt: new Date(user.updatedAt ?? Date.now()),
  };
}

function mapSession(session: Record<string, unknown>): SessionInfo {
  return {
    id: String(session.id ?? ""),
    userId: String(session.userId ?? ""),
    expiresAt: new Date((session.expiresAt as string) ?? Date.now()),
    ipAddress: (session.ipAddress as string | null) ?? null,
    userAgent: (session.userAgent as string | null) ?? null,
  };
}

interface BaResponse<TData> {
  data: TData;
  error: unknown;
}

function baCall<TData>(call: Promise<unknown>): Promise<BaResponse<TData>> {
  return call as Promise<BaResponse<TData>>;
}

export interface AuthClient {
  signIn: (input: LoginInput) => Promise<ClientResult<{ user: User }>>;
  signUp: (input: RegisterInput) => Promise<ClientResult<{ user: User }>>;
  signOut: () => Promise<ClientResult<void>>;
  getSession: (options?: {
    headers?: Headers;
  }) => Promise<ClientResult<{ user: User; session: SessionInfo } | null>>;
  currentUser: () => Promise<User | null>;
  forgetPassword: (input: ForgotPasswordInput) => Promise<ClientResult<void>>;
  resetPassword: (input: ResetPasswordInput) => Promise<ClientResult<void>>;
  verifyEmail: (input: { token: string }) => Promise<ClientResult<void>>;
  organization?: OrganizationClientApi;
}

export function createAuthClient(options: CreateAuthClientOptions): AuthClient {
  const client = createBetterAuthClient({
    baseURL: options.baseURL,
    fetchOptions: options.fetchOptions,
    ...(options.organizationEnabled
      ? { plugins: [organizationClient()] }
      : {}),
  });

  const signInFallback = { 401: "INVALID_CREDENTIALS" } as const;
  type SignInData = { user: BaUser };
  type SessionData = {
    user: BaUser | null;
    session: Record<string, unknown> | null;
  };

  return {
    signIn: async (input) => {
      const result = await toResult<SignInData>(
        baCall<SignInData>(
          client.signIn.email({
            email: input.email,
            password: input.password,
            rememberMe: input.rememberMe,
          }),
        ),
        signInFallback,
      );
      if (!result.ok) return result;
      return { ok: true, data: { user: mapUser(result.data.user) } };
    },

    signUp: async (input) => {
      const result = await toResult<SignInData>(
        baCall<SignInData>(
          client.signUp.email({
            name: input.name,
            email: input.email,
            password: input.password,
          }),
        ),
        { 422: "EMAIL_ALREADY_EXISTS" },
      );
      if (!result.ok) return result;
      return { ok: true, data: { user: mapUser(result.data.user) } };
    },

    signOut: () => toResult<void>(baCall<void>(client.signOut())),

    getSession: async (options) => {
      const result = await toResult<SessionData>(
        baCall<SessionData>(
          client.getSession(
            options?.headers
              ? { fetchOptions: { headers: options.headers } }
              : undefined,
          ),
        ),
        { 401: "INVALID_SESSION" },
      );
      if (!result.ok) return result;
      const payload = result.data;
      if (!payload?.user || !payload?.session) return { ok: true, data: null };
      return {
        ok: true,
        data: { user: mapUser(payload.user), session: mapSession(payload.session) },
      };
    },

    currentUser: async () => {
      const session = await toResult<SessionData>(
        baCall<SessionData>(client.getSession()),
        { 401: "INVALID_SESSION" },
      );
      if (!session.ok || !session.data?.user) return null;
      return mapUser(session.data.user);
    },

    forgetPassword: async (input) =>
      toResult<void>(
        baCall<void>(client.requestPasswordReset({ email: input.email })),
        { 404: "INVALID_CREDENTIALS" },
      ),

    resetPassword: async (input) =>
      toResult<void>(
        baCall<void>(
          client.resetPassword({
            newPassword: input.newPassword,
            token: input.token,
          }),
        ),
        { 400: "INVALID_RESET_TOKEN" },
      ),

    verifyEmail: async (input) =>
      toResult<void>(
        baCall<void>(client.verifyEmail({ query: { token: input.token } })),
        { 400: "INVALID_RESET_TOKEN" },
      ),

    ...(options.organizationEnabled
      ? {
          organization: (client as unknown as Record<string, unknown>)
            .organization as OrganizationClientApi,
        }
      : {}),
  };
}
