# verify-webapp/shared/environments

Holds the build-time environment configuration for the `verify-webapp`. It exports a single `environment` object that contains the trust-list URLs used during C2PA manifest validation.

## Structure

| File                  | Used when                              |
| --------------------- | -------------------------------------- |
| `environment.ts`      | Development (`nx serve verify-webapp`) |
| `environment.prod.ts` | Production (`nx build verify-webapp`)  |

The Angular build system swaps `environment.ts` for `environment.prod.ts` via `fileReplacements` in `apps/verify-webapp/project.json` when building for production.

## Configuration

| Property                 | Description                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| `trustListUrls`          | PEM trust anchors used to verify the C2PA manifest signature          |
| `timestampTrustListUrls` | PEM trust anchors used to verify the embedded RFC 3161 timestamp      |
| `trustedIcaIssuers`      | Allowed issuer identifiers for CAWG identity assertions (ICA issuers) |

## Local development trust list

The development environment prepends `/trust-list/local-dev.txt` to `trustListUrls`. This means you can verify against a custom certificate chain without modifying any source code:

1. Place your PEM file at `apps/verify-webapp/public/trust-list/local-dev.txt`
2. Run `pnpm nx serve verify-webapp`

The local PEM is served as a static asset by the dev server and is automatically included alongside all remote trust-list entries. If the file does not exist the request will 404 and the URL is silently skipped — remote trust-lists continue to work normally.

> **Note:** `local-dev.txt` is only present in the development environment. Production builds only use the remote trust-list URLs defined in `environment.prod.ts`.
