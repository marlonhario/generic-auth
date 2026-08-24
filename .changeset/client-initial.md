---
"@marlonoirah/auth-client": minor
---

Initial release. `createAuthClient()` wrapper producing `ClientResult`
discriminated unions on every call (never throws; network failures map to
`NETWORK_ERROR`), stable error-code mapping from Better Auth codes, normalized
user/session payloads, optional organization namespace, and RSC support via
`getSession({ headers })`.
