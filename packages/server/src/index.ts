export { AUTH_SERVER_VERSION } from "./version";
export {
  createAuthServer,
  type AuthRequest,
  type AuthServerInstance,
  type CreateAuthServerOptions,
  type DrizzleDatabase,
  type SessionOptions,
  type AdvancedOptions,
} from "./server";
export { buildAccessControl, normalizeRoleConfig } from "./access-control";
export { loadEnv, type EnvContract } from "./env";
export type {
  EmailInput,
  EmailSender,
  RateLimiter,
  RateLimitResult,
  ServerHooks,
} from "./interfaces";
export {
  fastifyAuthPlugin,
  createAuthenticate,
  createAuthorize,
  getAuthContext,
  type FastifyAuthPluginOptions,
} from "./adapters/fastify";
export {
  createTrpcMiddleware,
  type CreateTrpcMiddlewareOptions,
} from "./adapters/trpc";
export {
  authErrorToTrpcCode,
  toAuthError,
  type TrpcErrorCode,
} from "./adapters/trpc-codes";
export { runCli } from "./cli/run-cli";
export { generateSchemaSql } from "./cli/schema";
