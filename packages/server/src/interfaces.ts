import type { User } from "@marlonoirah/auth-core";

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailSender {
  send(input: EmailInput): Promise<void>;
}

export interface RateLimitResult {
  success: boolean;
  retryAfterSeconds?: number;
}

export interface RateLimiter {
  limit(key: string): Promise<RateLimitResult>;
}

export interface ServerHooks {
  onUserCreated?(user: User): Promise<void>;
  onLoginSuccess?(ctx: { userId: string }): Promise<void>;
  onLoginFailed?(ctx: { email: string; reason: string }): Promise<void>;
  onRoleAssigned?(ctx: { userId: string; role: string }): Promise<void>;
  onOrganizationInvitation?(ctx: {
    organizationId: string;
    email: string;
  }): Promise<void>;
}
