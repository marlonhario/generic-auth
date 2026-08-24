import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { AuthError } from "@marlonoirah/auth-core";
import type { AuthContext, PermissionString } from "@marlonoirah/auth-core";
import type { AuthServerInstance } from "../server";

export interface FastifyAuthPluginOptions {
  mountPath?: string;
  auth: AuthServerInstance;
}

function requestHeaders(request: FastifyRequest): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry);
    } else if (value != null) {
      headers.set(key, value);
    }
  }
  return headers;
}

function toWebRequest(request: FastifyRequest): Request {
  const url = new URL(
    request.raw.url ?? "/",
    `${request.protocol}://${request.headers.host ?? "localhost"}`,
  );
  const headers = requestHeaders(request);
  if (request.method === "GET" || request.method === "HEAD") {
    return new Request(url, { method: request.method, headers });
  }
  return new Request(url, {
    method: request.method,
    headers,
    body: JSON.stringify(request.body ?? {}),
    duplex: "half",
  });
}

async function applyWebResponse(response: FastifyReply, webResponse: Response) {
  response.status(webResponse.status);
  webResponse.headers.forEach((value, key) => response.header(key, value));
  return response.send(webResponse.body);
}

export const fastifyAuthPlugin: FastifyPluginAsync<FastifyAuthPluginOptions> =
  async (fastify, options) => {
    const mountPath = options.mountPath ?? "/api/auth";

    fastify.route({
      method: ["GET", "POST"],
      url: `${mountPath}/*`,
      handler: async (request, reply) => {
        const rateLimiter = options.auth.rateLimiter;
        if (rateLimiter) {
          const result = await rateLimiter.limit(request.ip);
          if (!result.success) {
            return reply
              .status(429)
              .send({ code: "RATE_LIMITED", message: "Too many requests" });
          }
        }
        return applyWebResponse(reply, await options.auth.handler(toWebRequest(request)));
      },
    });
  };

const contextStore = new WeakMap<object, AuthContext>();

export function getAuthContext(request: FastifyRequest): AuthContext | undefined {
  return contextStore.get(request);
}

export function createAuthenticate(
  instance: AuthServerInstance,
): (request: FastifyRequest) => Promise<void> {
  return async (request) => {
    contextStore.set(
      request,
      await instance.resolveContext({ headers: requestHeaders(request) }),
    );
  };
}

export function createAuthorize(
  instance: AuthServerInstance,
  permission: PermissionString,
): (request: FastifyRequest) => Promise<void> {
  return async (request) => {
    const context = await instance.resolveContext({
      headers: requestHeaders(request),
    });
    contextStore.set(request, context);
    if (!(await context.can(permission))) {
      throw new AuthError(
        "INSUFFICIENT_PERMISSIONS",
        `Missing permission "${permission}"`,
      );
    }
  };
}
