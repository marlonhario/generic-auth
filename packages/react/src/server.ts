import { AuthError } from "@marlonoirah/auth-core";
import type { AuthClient } from "@marlonoirah/auth-client";
import type { SessionInfo, User } from "@marlonoirah/auth-core";

export interface ServerAuthConfig {
  /** Returns the incoming request headers (e.g. `await headers()` in Next.js RSC). */
  headersProvider: () => Headers | Promise<Headers>;
}

let configured: ServerAuthConfig | null = null;

export function configureServerAuth(config: ServerAuthConfig): void {
  configured = config;
}

export interface ServerSession {
  user: User;
  session: SessionInfo;
}

export async function getServerSession(
  client: AuthClient,
): Promise<ServerSession | null> {
  if (!configured) {
    throw new AuthError(
      "CONFIGURATION",
      "auth-react/server: call configureServerAuth({ headersProvider }) before getServerSession()",
    );
  }
  const headers = await configured.headersProvider();
  const result = await client.getSession({ headers });
  if (!result.ok) return null;
  return result.data ?? null;
}

export async function requireServerSession(
  client: AuthClient,
): Promise<ServerSession> {
  const session = await getServerSession(client);
  if (!session) {
    throw new AuthError("INVALID_SESSION", "No valid session for this request");
  }
  return session;
}
