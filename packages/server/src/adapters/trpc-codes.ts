import { AuthError, isAuthErrorCode } from "@marlonoirah/auth-core";
import type { AuthErrorCode } from "@marlonoirah/auth-core";

export type TrpcErrorCode =
  | "BAD_REQUEST"
  | "INTERNAL_SERVER_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS";

const codeMap: Record<AuthErrorCode, TrpcErrorCode> = {
  INVALID_CREDENTIALS: "UNAUTHORIZED",
  EMAIL_ALREADY_EXISTS: "CONFLICT",
  EMAIL_NOT_VERIFIED: "FORBIDDEN",
  SESSION_EXPIRED: "UNAUTHORIZED",
  INVALID_SESSION: "UNAUTHORIZED",
  INVALID_RESET_TOKEN: "BAD_REQUEST",
  EXPIRED_RESET_TOKEN: "BAD_REQUEST",
  OAUTH_ERROR: "INTERNAL_SERVER_ERROR",
  RATE_LIMITED: "TOO_MANY_REQUESTS",
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "FORBIDDEN",
  ROLE_NOT_FOUND: "NOT_FOUND",
  PERMISSION_NOT_FOUND: "NOT_FOUND",
  ORGANIZATION_REQUIRED: "BAD_REQUEST",
  VALIDATION_ERROR: "BAD_REQUEST",
  CONFIGURATION: "INTERNAL_SERVER_ERROR",
};

export function authErrorToTrpcCode(error: unknown): TrpcErrorCode {
  if (error instanceof AuthError) {
    return codeMap[error.code];
  }
  return "INTERNAL_SERVER_ERROR";
}

export function toAuthError(value: unknown): AuthError | undefined {
  if (value instanceof AuthError) return value;
  if (
    value instanceof Error &&
    "code" in value &&
    typeof value.code === "string" &&
    isAuthErrorCode(value.code)
  ) {
    return new AuthError(value.code, value.message);
  }
  return undefined;
}
