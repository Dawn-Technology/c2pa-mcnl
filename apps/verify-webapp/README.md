# verify-webapp

This is a web application for verifying C2PA manifests. It allows users to upload media files and their corresponding C2PA manifests, and then verifies the authenticity of the media based on the information contained in the manifest.

### Development

To run the development server for the verification web application, use the following command:

```bash
  nx serve verify-webapp
```

### Building

```bash
  nx build verify-webapp
```

## Usage

### Configuring the trust-list

The trust-list is configured at build time based on the application configuration:

- **Production**: Uses the remote trust-lists from the [C2PA coalition](https://github.com/c2pa-org/conformance-public) and our own [trust-list repository](https://github.com/Dawn-Technology/c2pa-mcnl-trust-list).
- **Development**: Includes all production URLs plus a local development endpoint (`/trust-list/local-dev.txt`) that prepends the development trust-list.

#### Adding a custom trust-list for local development

For development purposes, you can verify against a custom trust-list without modifying code:

1. Create a `.txt` file with your certificate chain obtained from the [cert-generator](../../tools/cert-generator/README.md)
2. Place it at: `apps/verify-webapp/public/trust-list/local-dev.txt`
3. Run `nx serve verify-webapp` (development build)
4. The local certificate will be automatically included in the verification process

**Note**: The local trust-list is appended to the remote trust-lists, so verification uses the combined set of certificates. The `/trust-list/local-dev.txt` endpoint is development-only and not available in production builds.
