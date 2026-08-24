import type { EmailSender } from "@marlonoirah/auth-server";

/** Replace with SES/Resend/Postmark — anything that can send an email. */
export const emailSender: EmailSender = {
  async send({ to, subject, html }) {
    console.log(`[email] to=${to} subject=${subject}`);
    if (process.env.NODE_ENV !== "production") {
      console.log(html);
    }
  },
};
