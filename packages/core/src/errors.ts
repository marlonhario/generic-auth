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
  | "VALIDATION_ERROR"
  | "CONFIGURATION";

/** Stable, machine-readable mapping. Part of the public contract. */
export const errorCodeToStatus: Record<AuthErrorCode, number> = {
  INVALID_CREDENTIALS: 401,
  EMAIL_ALREADY_EXISTS: 409,
  EMAIL_NOT_VERIFIED: 403,
  SESSION_EXPIRED: 401,
  INVALID_SESSION: 401,
  INVALID_RESET_TOKEN: 400,
  EXPIRED_RESET_TOKEN: 400,
  OAUTH_ERROR: 502,
  RATE_LIMITED: 429,
  FORBIDDEN: 403,
  INSUFFICIENT_PERMISSIONS: 403,
  ROLE_NOT_FOUND: 404,
  PERMISSION_NOT_FOUND: 404,
  ORGANIZATION_REQUIRED: 400,
  VALIDATION_ERROR: 400,
  CONFIGURATION: 500,
};

const statusCodeToCode = new Map<AuthErrorCode, number>(
  Object.entries(errorCodeToStatus).map(([code, status]) => [
    code as AuthErrorCode,
    status,
  ]),
);

export function isAuthErrorCode(value: string): value is AuthErrorCode {
  return statusCodeToCode.has(value as AuthErrorCode);
}

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status: number;

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AuthError";
    this.code = code;
    this.status = errorCodeToStatus[code];
  }
}
