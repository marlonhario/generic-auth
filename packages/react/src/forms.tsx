import {
  useCallback,
  useState,
  type ReactNode,
} from "react";
import type { ClientError, ClientResult } from "@marlonoirah/auth-client";
import {
  forgotPasswordInputSchema,
  loginInputSchema,
  registerInputSchema,
  resetPasswordInputSchema,
  verifyEmailInputSchema,
} from "@marlonoirah/auth-core";
import { z } from "zod";
import { useAuthState } from "./provider";

export interface FieldProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
}

export interface BaseFormRenderProps<F> {
  fields: F;
  submit: () => Promise<ClientResult<unknown>>;
  loading: boolean;
  error: ClientError | null;
}

export type FieldsOf<T extends readonly string[]> = {
  [K in T[number]]: FieldProps;
};

export interface FormComponentProps<F> {
  children: (props: BaseFormRenderProps<F>) => ReactNode;
}

function validationError(issues: z.ZodIssue[]): {
  ok: false;
  error: ClientError;
} {
  const error: ClientError = {
    code: "VALIDATION_ERROR",
    message: issues[0]?.message ?? "VALIDATION_ERROR",
    status: 422,
  };
  return { ok: false, error };
}

type AnyClientResult = Promise<ClientResult<unknown>>;

function makeField(
  name: string,
  value: string,
  onChange: (value: string) => void,
): FieldProps {
  return { name, value, onChange };
}

export function LoginForm({ children }: FormComponentProps<FieldsOf<['email', 'password']>>) {
  const { client, refresh } = useAuthState();
  const [emailValue, setEmail] = useState("");
  const [passwordValue, setPassword] = useState("");
  const email = makeField("email", emailValue, setEmail);
  const password = makeField("password", passwordValue, setPassword);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClientError | null>(null);

  const submit = useCallback(async (): AnyClientResult => {
    setError(null);
    const parsed = loginInputSchema.safeParse({
      email: email.value,
      password: password.value,
    });
    if (!parsed.success) {
      const result = validationError(parsed.error.issues);
      setError(result.error);
      return result;
    }
    setLoading(true);
    try {
      const result = await client.signIn(parsed.data);
      if (result.ok) await refresh();
      else setError(result.error);
      return result;
    } finally {
      setLoading(false);
    }
  }, [client, email, password, refresh]);

  return (
    <>{children({ fields: { email, password }, submit, loading, error })}</>
  );
}

export function RegisterForm({ children }: FormComponentProps<FieldsOf<['name', 'email', 'password']>>) {
  const { client, refresh } = useAuthState();
  const [nameValue, setName] = useState("");
  const [emailValue, setEmail] = useState("");
  const [passwordValue, setPassword] = useState("");
  const name = makeField("name", nameValue, setName);
  const email = makeField("email", emailValue, setEmail);
  const password = makeField("password", passwordValue, setPassword);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClientError | null>(null);

  const submit = useCallback(async (): AnyClientResult => {
    setError(null);
    const parsed = registerInputSchema.safeParse({
      name: name.value,
      email: email.value,
      password: password.value,
    });
    if (!parsed.success) {
      const result = validationError(parsed.error.issues);
      setError(result.error);
      return result;
    }
    setLoading(true);
    try {
      const result = await client.signUp(parsed.data);
      if (result.ok) await refresh();
      else setError(result.error);
      return result;
    } finally {
      setLoading(false);
    }
  }, [client, name, email, password, refresh]);

  return (
    <>{children({ fields: { name, email, password }, submit, loading, error })}</>
  );
}

export function ForgotPasswordForm({ children }: FormComponentProps<FieldsOf<['email']>>) {
  const { client } = useAuthState();
  const [emailValue, setEmail] = useState("");
  const email = makeField("email", emailValue, setEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClientError | null>(null);

  const submit = useCallback(async (): AnyClientResult => {
    setError(null);
    const parsed = forgotPasswordInputSchema.safeParse({ email: email.value });
    if (!parsed.success) {
      const result = validationError(parsed.error.issues);
      setError(result.error);
      return result;
    }
    setLoading(true);
    try {
      const result = await client.forgetPassword(parsed.data);
      if (!result.ok) setError(result.error);
      return result;
    } finally {
      setLoading(false);
    }
  }, [client, email]);

  return <>{children({ fields: { email }, submit, loading, error })}</>;
}

export function ResetPasswordForm({ children }: FormComponentProps<FieldsOf<['newPassword', 'token']>>) {
  const { client } = useAuthState();
  const [newPasswordValue, setNewPassword] = useState("");
  const [tokenValue, setToken] = useState("");
  const newPassword = makeField("newPassword", newPasswordValue, setNewPassword);
  const token = makeField("token", tokenValue, setToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClientError | null>(null);

  const submit = useCallback(async (): AnyClientResult => {
    setError(null);
    const parsed = resetPasswordInputSchema.safeParse({
      newPassword: newPassword.value,
      token: token.value,
    });
    if (!parsed.success) {
      const result = validationError(parsed.error.issues);
      setError(result.error);
      return result;
    }
    setLoading(true);
    try {
      const result = await client.resetPassword(parsed.data);
      if (!result.ok) setError(result.error);
      return result;
    } finally {
      setLoading(false);
    }
  }, [client, newPassword, token]);

  return (
    <>
      {children({ fields: { newPassword, token }, submit, loading, error })}
    </>
  );
}

export function VerifyEmailForm({ children }: FormComponentProps<FieldsOf<['token']>>) {
  const { client, refresh } = useAuthState();
  const [tokenValue, setToken] = useState("");
  const token = makeField("token", tokenValue, setToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClientError | null>(null);

  const submit = useCallback(async (): AnyClientResult => {
    setError(null);
    const parsed = verifyEmailInputSchema.safeParse({ token: token.value });
    if (!parsed.success) {
      const result = validationError(parsed.error.issues);
      setError(result.error);
      return result;
    }
    setLoading(true);
    try {
      const result = await client.verifyEmail(parsed.data);
      if (result.ok) await refresh();
      else setError(result.error);
      return result;
    } finally {
      setLoading(false);
    }
  }, [client, token, refresh]);

  return <>{children({ fields: { token }, submit, loading, error })}</>;
}
