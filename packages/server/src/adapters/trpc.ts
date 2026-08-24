import { AuthError } from "@marlonoirah/auth-core";
import type { AuthContext, PermissionString } from "@marlonoirah/auth-core";
import type { AuthServerInstance } from "../server";

export interface TrpcRequestLike {
  headers?: unknown;
}

export interface TrpcContextLike {
  req?: unknown;
}

export interface TrpcMiddlewareParams {
  ctx: TrpcContextLike;
  next: (options?: { ctx?: Record<string, unknown> }) => Promise<unknown>;
}

function headersFromRequest(req: unknown): Headers {
  if (req instanceof Request) {
    return req.headers;
  }
  const headers = new Headers();
  const raw = (
    req as { headers?: Record<string, string | string[]> } | undefined
  )?.headers;
  if (raw) {
    for (const [key, value] of Object.entries(raw)) {
      if (Array.isArray(value)) {
        for (const entry of value) headers.append(key, entry);
      } else {
        headers.set(key, value);
      }
    }
  }
  return headers;
}

export interface CreateTrpcMiddlewareOptions {
  permission?: PermissionString;
}

export function createTrpcMiddleware(
  instance: AuthServerInstance,
  options: CreateTrpcMiddlewareOptions = {},
) {
  return async ({ ctx, next }: TrpcMiddlewareParams) => {
    const context: AuthContext = await instance.resolveContext({
      headers: headersFromRequest(ctx.req),
    });

    if (options.permission && !(await context.can(options.permission))) {
      throw new AuthError(
        "INSUFFICIENT_PERMISSIONS",
        `Missing permission "${options.permission}"`,
      );
    }

    return next({ ctx: { ...ctx, auth: context } as Record<string, unknown> });
  };
}
