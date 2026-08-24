export { createAuthClient } from "./client";
export type {
  AuthClient,
  CreateAuthClientOptions,
  OrganizationClientApi,
} from "./client";
export { normalizeClientError } from "./result";
export type {
  ClientError,
  ClientErrorCode,
  ClientResult,
} from "./result";

export const AUTH_CLIENT_VERSION = "0.0.0" as const;
