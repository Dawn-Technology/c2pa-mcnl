# DID Generator & Verifiable Credentials Issuer CLI

CLI tool for generating DIDs (Decentralized Identifiers), Ed25519 cryptographic keys, and issuing verifiable credentials using did-jwt-vc.

## CLI Usage

### Generate Everything (Keys + DID + Credential)

Generate keys, DID document, and issue an employment credential interactively:

```bash
nx run did-generator:generate
```

View help for the generate command:

```bash
nx run did-generator:generate -- --help
```

Generate everything with command-line options:

```bash
nx run did-generator:generate -- \
  --domain example.com \
  --name "John Doe" \
  --role "Senior Developer" \
  --company "My Company" \
  --employee-id "EMP001" \
  --no-interactive
```

### Generate Keys Only

Generate only cryptographic keys (Ed25519):

```bash
nx run did-generator:keys
```

View help for the keys command:

```bash
nx run did-generator:keys -- --help
```

Generate keys with custom output:

```bash
nx run did-generator:keys -- --output ./my-keys --no-interactive
```

### Generate DID Document

Generate DID document from existing keys (interactive):

```bash
nx run did-generator:did
```

View help for the did command:

```bash
nx run did-generator:did -- --help
```

Generate DID with options:

```bash
nx run did-generator:did -- \
  --domain example.com \
  --key-file ./output/public-key.jwk \
  --output ./my-did \
  --no-interactive
```

### Issue Credential

Issue a verifiable credential using existing DID and keys (interactive):

```bash
nx run did-generator:credential
```

View help for the credential command:

```bash
nx run did-generator:credential -- --help
```

Issue credential with options:

```bash
nx run did-generator:credential -- \
  --did "did:web:example.com" \
  --key-file ./output/private-key.hex \
  --name "Jane Smith" \
  --role "Engineering Manager" \
  --company "Tech Corp" \
  --no-interactive
```

## DID Document Structure

The generated DID document follows the did:web method specification:

```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:example.com",
  "verificationMethod": [
    {
      "id": "did:web:example.com#key-1",
      "type": "JsonWebKey2020",
      "controller": "did:web:example.com",
      "publicKeyJwk": {}
    }
  ],
  "authentication": ["did:web:example.com#key-1"],
  "assertionMethod": ["did:web:example.com#key-1"]
}
```

## Credential Structure

The issued employment credentials follow the W3C Verifiable Credentials specification:

```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential", "EmploymentCredential"],
  "issuer": "did:web:example.com",
  "credentialSubject": {
    "id": "did:web:employee.example.com",
    "employeeName": "John Doe",
    "employeeRole": "Senior Developer",
    "employeeId": "EMP001",
    "company": "My Company",
    "department": "Engineering",
    "startDate": "2024-01-01"
  },
  "issuanceDate": "2024-01-15T10:30:00Z",
  "proof": {}
}
```

## Programmatic Usage

You can also use the DID generator as a library:

```typescript
import { generateKeys, createDIDDocument, issueCredential } from '@c2pa-mcnl/did-generator';

// Generate keys
const { jwk, privateKeyHex } = generateKeys('./output');

// Create DID document
const { did, didDocument } = createDIDDocument('example.com', jwk, './output');

// Issue credential
const credentialData = {
  employeeName: 'John Doe',
  employeeRole: 'Developer',
  company: 'My Company',
};
await issueCredential(did, credentialData, privateKeyHex, './output');
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Private Key Security**: Never commit private keys to version control
2. **Key Storage**: Store private keys securely with appropriate file permissions (e.g., 0600)
3. **DID Web Method**: Requires HTTPS hosting of the DID document at `https://{domain}/.well-known/did.json`
4. **Credential Verification**: Always verify credentials before trusting them
5. **Production Use**: This tool is designed for development and testing. For production, implement proper key management and rotation policies

## Examples

### Quick Start - Generate Everything

Generate a complete set of keys, DID, and credential interactively:

```bash
nx run did-generator:generate
```

Just answer the prompts and press Enter to use defaults!

### Issue Multiple Credentials

First, generate keys and DID once:

```bash
nx run did-generator:generate -- \
  --domain mycompany.com \
  --name "John Doe" \
  --role "Developer" \
  --company "My Company" \
  --no-interactive
```

Then issue additional credentials using the same DID:

```bash
nx run did-generator:credential -- \
  --did "did:web:mycompany.com" \
  --key-file ./output/private-key.hex \
  --name "Jane Smith" \
  --role "Designer" \
  --company "My Company" \
  --output ./credentials/jane \
  --no-interactive
```

### Generate Keys for External Use

Generate keys to use with other tools:

```bash
nx run did-generator:keys -- \
  --output ./my-keys \
  --no-interactive
```

### Create DID from Existing Keys

If you have existing keys, create a DID document:

```bash
nx run did-generator:did -- \
  --domain example.com \
  --key-file ./my-keys/public-key.jwk \
  --output ./my-did \
  --no-interactive
```

## DID Web Method Setup

To use the generated DID, you need to host the DID document at:

```
https://{your-domain}/.well-known/did.json
```

Example for `did:web:example.com`:

1. Generate the DID: `nx run did-generator:did -- --domain example.com --key-file ./public-key.jwk`
2. Copy `did.json` to your web server at `/.well-known/did.json`
3. Ensure it's accessible via HTTPS at `https://example.com/.well-known/did.json`

## Help

View all available commands and options:

```bash
nx run did-generator:help
```

View help for a specific command:

```bash
nx run did-generator:generate -- --help
nx run did-generator:keys -- --help
nx run did-generator:did -- --help
nx run did-generator:credential -- --help
```

## Building

Run `nx build did-generator` to build the library.
