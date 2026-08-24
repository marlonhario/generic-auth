import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AuthClient,
  ClientError,
  ClientResult,
} from "@marlonoirah/auth-client";
import type {
  PermissionString,
  RoleName,
  SessionInfo,
  User,
} from "@marlonoirah/auth-core";

export interface AuthProviderProps {
  client: AuthClient;
  children: ReactNode;
  /** Same role definitions given to createAuthServer — powers client-side permission UX. */
  roles?: Record<RoleName, readonly PermissionString[]>;
}

export interface SessionPayload {
  user: User;
  session: SessionInfo;
}

export interface AuthState {
  client: AuthClient;
  roleMap: Record<RoleName, readonly PermissionString[]> | undefined;
  session: SessionPayload | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthStateContext = createContext<AuthState | null>(null);

export function AuthProvider({ client, children, roles }: AuthProviderProps) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await client.getSession();
      setSession(result.ok ? (result.data ?? null) : null);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({ client, roleMap: roles, session, loading, refresh }),
    [client, roles, session, loading, refresh],
  );

  return (
    <AuthStateContext.Provider value={value}>
      {children}
    </AuthStateContext.Provider>
  );
}

export function useAuthState(): AuthState {
  const state = useContext(AuthStateContext);
  if (!state) {
    throw new Error(
      "auth-react: components and hooks must be rendered inside <AuthProvider>",
    );
  }
  return state;
}
