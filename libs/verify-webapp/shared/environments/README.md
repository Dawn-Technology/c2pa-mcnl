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
