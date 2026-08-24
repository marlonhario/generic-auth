import type { ReactElement } from "react";
import { AuthProvider, RequirePermission, LoginForm } from "@marlonoirah/auth-react";
import { createClient, clientRoles } from "./client";

export function App(): ReactElement {
  return (
    <AuthProvider client={createClient()} roles={clientRoles}>
      <Dashboard />
    </AuthProvider>
  );
}

function Dashboard(): ReactElement {
  return (
    <RequirePermission permission="projects.read" fallback={<p>Sign in to view projects.</p>}>
      {/* Headless form: consumer owns all markup and styling. */}
      <LoginForm>
        {({ fields, submit, loading, error }) => (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit().then((result) => {
                if (result.ok) window.location.href = "/dashboard";
              });
            }}
          >
            <input
              name={fields.email.name}
              value={fields.email.value}
              onChange={(e) => fields.email.onChange(e.target.value)}
              placeholder="Email"
            />
            <input
              name={fields.password.name}
              type="password"
              value={fields.password.value}
              onChange={(e) => fields.password.onChange(e.target.value)}
              placeholder="Password"
            />
            <button disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
            {error && <p role="alert">{error.message}</p>}
          </form>
        )}
      </LoginForm>

      <RequirePermission permission="users.delete" fallback={<p>Admin tools hidden.</p>}>
        <button>Delete user</button>
      </RequirePermission>
    </RequirePermission>
  );
}
