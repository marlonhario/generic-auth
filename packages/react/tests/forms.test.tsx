import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import type { AuthClient, ClientResult } from "@marlonoirah/auth-client";
import type { User } from "@marlonoirah/auth-core";
import { AuthProvider, LoginForm, RegisterForm } from "../src";

function makeUser(): User {
  return {
    id: "u1",
    name: "User",
    email: "user@example.com",
    emailVerified: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

type FormProps = Parameters<Parameters<typeof LoginForm>[0]["children"]>[0];

function renderForm(
  Component: typeof LoginForm,
  client: AuthClient,
): { current: FormProps } {
  const ref = { current: undefined as unknown as FormProps };
  render(
    <AuthProvider client={client}>
      <Component>
        {(props) => {
          ref.current = props;
          return null;
        }}
      </Component>
    </AuthProvider>,
  );
  return ref as { current: FormProps };
}

function makeClient(signInResult?: ClientResult<{ user: User }>): {
  client: AuthClient;
  signIn: ReturnType<typeof vi.fn>;
  getSessionCalls: () => number;
} {
  const signIn = vi.fn(async () => signInResult ?? {
    ok: false as const,
    error: { code: "INVALID_CREDENTIALS" as const, message: "x", status: 401 },
  });
  let sessionCalls = 0;
  const client = {
    signIn,
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(async () => {
      sessionCalls += 1;
      return {
        ok: true as const,
        data:
          sessionCalls > 1
            ? { user: makeUser(), session: { token: "t", expiresAt: new Date() } }
            : null,
      };
    }),
    currentUser: vi.fn(async () => null),
    forgetPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
  } as unknown as AuthClient;
  return { client, signIn, getSessionCalls: () => sessionCalls };
}

describe("LoginForm", () => {
  it("reports VALIDATION_ERROR without calling the API for a malformed email", async () => {
    const { client, signIn } = makeClient();
    const props = renderForm(LoginForm, client);

    await act(async () => {
      props.current.fields.email.onChange("not-an-email");
      props.current.fields.password.onChange("hunter2000");
    });
    let result: ClientResult<unknown> | undefined;
    await act(async () => {
      result = await props.current.submit();
    });

    expect(result?.ok).toBe(false);
    if (!result?.ok) {
      expect(result?.error.code).toBe("VALIDATION_ERROR");
    }
    expect(signIn).not.toHaveBeenCalled();
    expect(props.current.error?.code).toBe("VALIDATION_ERROR");
    expect(client.getSession).toHaveBeenCalledTimes(1);
  });

  it("refreshes the session after a successful sign-in", async () => {
    const user = makeUser();
    const { client, signIn, getSessionCalls } = makeClient({
      ok: true,
      data: { user },
    });
    const props = renderForm(LoginForm, client);

    await act(async () => {
      props.current.fields.email.onChange("user@example.com");
      props.current.fields.password.onChange("hunter2000");
    });
    let result: ClientResult<unknown> | undefined;
    await act(async () => {
      result = await props.current.submit();
    });

    expect(result?.ok).toBe(true);
    expect(signIn).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "hunter2000",
    });
    expect(getSessionCalls()).toBeGreaterThan(1);
  });

  it("exposes the mapped error and keeps loading false afterwards", async () => {
    const { client } = makeClient();
    const props = renderForm(LoginForm, client);

    await act(async () => {
      props.current.fields.email.onChange("user@example.com");
      props.current.fields.password.onChange("wrong-pass");
    });
    await act(async () => {
      await props.current.submit();
    });

    expect(props.current.loading).toBe(false);
    expect(props.current.error?.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("RegisterForm", () => {
  it("validates input against registerInputSchema before submitting", async () => {
    let signUpCalled = false;
    const client = {
      signIn: vi.fn(),
      signUp: vi.fn(async () => {
        signUpCalled = true;
        return { ok: true as const, data: { user: makeUser() } };
      }),
      signOut: vi.fn(),
      getSession: vi.fn(async () => ({ ok: true as const, data: null })),
      currentUser: vi.fn(async () => null),
      forgetPassword: vi.fn(),
      resetPassword: vi.fn(),
      verifyEmail: vi.fn(),
    } as unknown as AuthClient;
    const props = renderForm(RegisterForm, client);

    await act(async () => {
      props.current.fields.name.onChange("");
      props.current.fields.email.onChange("user@example.com");
      props.current.fields.password.onChange("hunter2000");
    });
    let result: ClientResult<unknown> | undefined;
    await act(async () => {
      result = await props.current.submit();
    });

    expect(result?.ok).toBe(false);
    if (!result?.ok) expect(result?.error.code).toBe("VALIDATION_ERROR");
    expect(signUpCalled).toBe(false);
  });
});
