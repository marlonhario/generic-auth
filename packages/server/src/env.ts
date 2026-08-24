import { z } from "zod";
import { AuthError } from "@marlonoirah/auth-core";

const envSchema = z.object({
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_BASE_URL: z.url("AUTH_BASE_URL must be a valid URL"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_TRUSTED_ORIGINS: z.string().optional(),
});

export interface EnvContract {
  AUTH_SECRET: string;
  AUTH_BASE_URL: string;
  DATABASE_URL: string;
  AUTH_TRUSTED_ORIGINS?: string[];
}

/**
 * Authentication cookies are scoped to the external base URL. An `http://`
 * base URL in production yields non-secure session cookies — refuse loudly
 * instead of failing silently at the cookie layer.
 */
function assertProductionBaseUrl(baseUrl: string, nodeEnv: string): void {
  if (nodeEnv !== "production") return;
  if (baseUrl.startsWith("http://")) {
    throw new AuthError(
      "CONFIGURATION",
      `loadEnv: AUTH_BASE_URL must use https:// in production (got "${baseUrl}"). Session cookies would be sent without the Secure flag.`,
    );
  }
}

export function loadEnv(
  source: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): EnvContract {
  const parsed = envSchema.parse(source);
  assertProductionBaseUrl(parsed.AUTH_BASE_URL, source.NODE_ENV ?? "");
  const trustedOrigins = parsed.AUTH_TRUSTED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return {
    AUTH_SECRET: parsed.AUTH_SECRET,
    AUTH_BASE_URL: parsed.AUTH_BASE_URL,
    DATABASE_URL: parsed.DATABASE_URL,
    ...(trustedOrigins && trustedOrigins.length > 0
      ? { AUTH_TRUSTED_ORIGINS: trustedOrigins }
      : {}),
  };
}
