# @marlonoirah/auth-client

## 0.1.0

### Minor Changes

- [`66f0912`](https://github.com/marlonhario/generic-auth/commit/66f091249a247fd84442f65e7f201b04897aba0b) Thanks [@marlonhario](https://github.com/marlonhario)! - Initial release. `createAuthClient()` wrapper producing `ClientResult`
  discriminated unions on every call (never throws; network failures map to
  `NETWORK_ERROR`), stable error-code mapping from Better Auth codes, normalized
  user/session payloads, optional organization namespace, and RSC support via
  `getSession({ headers })`.

### Patch Changes

- Updated dependencies [[`66f0912`](https://github.com/marlonhario/generic-auth/commit/66f091249a247fd84442f65e7f201b04897aba0b)]:
  - @marlonoirah/auth-core@0.1.0
