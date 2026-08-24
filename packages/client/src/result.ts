import type { AuthErrorCode } from "@marlonoirah/auth-core";
import { isAuthErrorCode } from "@marlonoirah/auth-core";

export type ClientErrorCode = AuthErrorCode | "NETWORK_ERROR";

export interface ClientError {
  code: ClientErrorCode;
  message: string;
  status: number;
}

export type ClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ClientError };

const baCodeToAuthCode: Record<string, AuthErrorCode> = {
  INVALID_EMAIL_OR_PASSWORD: "INVALID_CREDENTIALS",
  SOCIAL_ACCOUNT_ALREADY_LINKED: "EMAIL_ALREADY_EXISTS",
  USER_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  USER_EMAIL_NOT_FOUND: "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  EMAIL_NOT_VERIFIED_2FA: "EMAIL_NOT_VERIFIED",
  RESET_PASSWORD_TOKEN_EXPIRED: "EXPIRED_RESET_TOKEN",
  INVALID_RESET_TOKEN: "INVALID_RESET_TOKEN",
  TOKEN_EXPIRED: "EXPIRED_RESET_TOKEN",
  INVALID_TOKEN: "INVALID_RESET_TOKEN",
  INVALID_OTP: "VALIDATION_ERROR",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_SESSION_TOKEN: "INVALID_SESSION",
  FAILED_TO_CREATE_USER: "VALIDATION_ERROR",
  INVALID_PASSWORD: "VALIDATION_ERROR",
  PASSWORD_TOO_SHORT: "VALIDATION_ERROR",
  PASSWORD_TOO_LONG: "VALIDATION_ERROR",
  WEAK_PASSWORD: "VALIDATION_ERROR",
  USER_BANNED: "FORBIDDEN",
  RATE_LIMITED: "RATE_LIMITED",
};

const statusFallbacks: Record<number, AuthErrorCode> = {
  400: "VALIDATION_ERROR",
  401: "INVALID_CREDENTIALS",
  403: "FORBIDDEN",
  404: "ROLE_NOT_FOUND",
  409: "EMAIL_ALREADY_EXISTS",
  422: "VALIDATION_ERROR",
  429: "RATE_LIMITED",
};

export function normalizeClientError(
  error: unknown,
  fallbackByStatus?: Partial<Record<number, AuthErrorCode>>,
): ClientError {
  if (
    error &&
    typeof error === "object" &&
    ("status" in error || "statusCode" in error)
  ) {
    const raw = error as {
      message?: unknown;
      status?: unknown;
      statusCode?: unknown;
      code?: unknown;
    };
    const status =
      typeof raw.status === "number"
        ? raw.status
        : typeof raw.statusCode === "number"
          ? raw.statusCode
          : 500;
    const message =
      typeof raw.message === "string" && raw.message.length > 0
        ? raw.message
        : "";
    const rawCode = typeof raw.code === "string" ? raw.code : undefined;
    const mapped =
      rawCode !== undefined ? baCodeToAuthCode[rawCode] : undefined;
    let code: ClientErrorCode;
    if (rawCode !== undefined && isAuthErrorCode(rawCode)) {
      code = rawCode;
    } else if (mapped !== undefined) {
      code = mapped;
    } else {
      code =
        fallbackByStatus?.[status] ??
        statusFallbacks[status] ??
        "VALIDATION_ERROR";
    }
    return { code, message: message || code, status };
  }
  return {
    code: "NETWORK_ERROR",
    message:
      error instanceof Error ? error.message : "Request could not be completed",
    status: 0,
  };
}

interface BaResponse<TData> {
  data: TData;
  error: unknown;
}

export async function toResult<TData>(
  call: Promise<BaResponse<TData>>,
  fallbackByStatus?: Partial<Record<number, AuthErrorCode>>,
): Promise<ClientResult<TData>> {
  try {
    const response = await call;
    if (response.error) {
      return {
        ok: false,
        error: normalizeClientError(response.error, fallbackByStatus),
      };
    }
    return { ok: true, data: response.data };
  } catch (error) {
    return {
      ok: false,
      error: normalizeClientError(error),
    };
  }
}
