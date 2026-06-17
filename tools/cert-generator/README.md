# Certificate Generator CLI

CLI tool for generating X.509 certificate chains using Ed25519 keys.

## CLI Usage

### Generate Complete Certificate Chain

Generate a full certificate chain (root + intermediate + leaf) interactively:

```bash
nx run cert-generator:chain
```

Generate chain with command-line options (applies to all certificates):

```bash
nx run cert-generator:chain -- --country NL --state "Zuid-Holland" --organization "My Company" --common-name "My Root CA" --no-interactive
```

> **Note**: When using `--common-name` with the chain command, it will be used as the base name:
>
> - Root: "My Root CA"
> - Intermediate: "My Root CA - Intermediate"
> - Leaf: "My Root CA - Leaf"

Generate chain without leaf certificate:

```bash
nx run cert-generator:chain -- --no-include-leaf
```

### Generate Root Certificate Only

Generate a root certificate interactively:

```bash
nx run cert-generator:root
```

View help for the root command:

```bash
nx run cert-generator:root -- --help
```

Generate root with options:

```bash
nx run cert-generator:root -- --country NL --state "Zuid-Holland" --organization "My Company" --common-name "My Root CA" --no-interactive
```

### Generate Intermediate Certificate

Generate an intermediate certificate from an existing root (interactive):

```bash
nx run cert-generator:intermediate
```

View help for the intermediate command:

```bash
nx run cert-generator:intermediate -- --help
```

Generate intermediate with options:

```bash
nx run cert-generator:intermediate -- \
  --root-cert ./output/root-cert.pem \
  --root-key ./output/root-private-key.pem \
  --country NL \
  --common-name "My Intermediate CA" \
  --no-interactive
```

### Generate Leaf Certificate

Generate a leaf certificate from an existing intermediate (interactive):

```bash
nx run cert-generator:leaf
```

View help for the leaf command:

```bash
nx run cert-generator:leaf -- --help
```

Generate leaf with options:

```bash
nx run cert-generator:leaf -- \
  --intermediate-cert ./output/intermediate-cert.pem \
  --intermediate-key ./output/intermediate-private-key.pem \
  --country NL \
  --common-name "My Service" \
  --no-interactive
```

## Certificate Properties

### Root Certificate

- Self-signed
- Basic Constraints: CA=true, pathLen=3
- Key Usage: digitalSignature, keyCertSign, cRLSign
- Algorithm: Ed25519

### Intermediate Certificate

- Signed by root certificate
- Basic Constraints: CA=true, pathLen=2
- Key Usage: digitalSignature, keyCertSign
- Extended Key Usage: emailProtection
- Algorithm: Ed25519

### Leaf Certificate

- Signed by intermediate certificate
- Basic Constraints: CA=false
- Key Usage: digitalSignature
- Extended Key Usage: emailProtection
- Algorithm: Ed25519

## Programmatic Usage

You can also use the certificate generator as a library:

```typescript
import { generateCertificateChain, generateRootCertificate, generateIntermediateCertificate, generateLeafCertificate, type CertificateSubject } from '@c2pa-mcnl/cert-generator';

// Generate complete chain
const chain = await generateCertificateChain({ commonName: 'Root CA', country: 'NL', organization: 'My Company' }, { commonName: 'Intermediate CA', country: 'NL', organization: 'My Company' }, { commonName: 'My Service', country: 'NL', organization: 'My Company' });

// Access certificates and keys
console.log(chain.root.certificatePem);
console.log(chain.intermediate.certificatePem);
console.log(chain.leaf?.certificatePem);
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Private Key Security**: Never commit private keys to version control
2. **Production Use**: This tool is designed for development and testing. For production certificate authorities, use proper CA infrastructure
3. **Key Storage**: Store private keys securely with appropriate file permissions
4. **Certificate Validation**: Always validate certificates before use
5. **Regular Rotation**: Implement certificate rotation policies

## Examples

### Development Environment Setup

Generate a complete certificate chain for local development:

```bash
nx run cert-generator:chain -- \
  --country NL \
  --state "Zuid-Holland" \
  --organization "Dawn Technology" \
  --organizational-unit "Development" \
  --common-name "Dev Root CA" \
  --output ./certs/dev \
  --no-interactive
```

### Generate Root CA for Testing

```bash
nx run cert-generator:root -- \
  --country US \
  --organization "Test Company" \
  --common-name "Test Root CA" \
  --output ./test-certs \
  --no-interactive
```

### Add New Service Certificate

Using existing intermediate certificate:

```bash
nx run cert-generator:leaf -- \
  --intermediate-cert ./certs/intermediate-cert.pem \
  --intermediate-key ./certs/intermediate-private-key.pem \
  --common-name "api.myservice.com" \
  --output ./certs/services/api \
  --no-interactive
```

## Help

View all available commands and options:

```bash
nx run cert-generator:help
```

View help for a specific command:

```bash
nx run cert-generator:chain -- --help
nx run cert-generator:root -- --help
nx run cert-generator:intermediate -- --help
nx run cert-generator:leaf -- --help
```

## Building

Run `nx build cert-generator` to build the library.
