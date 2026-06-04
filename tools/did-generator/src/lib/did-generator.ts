import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { header, log } from '@c2pa-mcnl/shared/utils/cli';

// Create DID Document for did:web
export function createDIDDocument(
  domain: string,
  jwk: crypto.JsonWebKey,
  outputDir: string,
) {
  header('Step 2: Creating DID Document');

  // Encode colons for ports (e.g., localhost:3000 becomes localhost%3A3000)
  const encodedDomain = domain.replace(/:/g, '%3A');
  const did = `did:web:${encodedDomain}`;

  log(`Creating DID: ${did}`, 'yellow');

  const didDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/jws-2020/v1',
    ],
    id: did,
    verificationMethod: [
      {
        id: `${did}#key-1`,
        type: 'JsonWebKey2020',
        controller: did,
        publicKeyJwk: jwk,
      },
    ],
    authentication: [`${did}#key-1`],
    assertionMethod: [
      {
        id: `${did}#key-1`,
        type: 'JsonWebKey2020',
        controller: did,
        publicKeyJwk: jwk,
      },
    ],
  };

  fs.writeFileSync(
    path.join(outputDir, 'did.json'),
    JSON.stringify(didDocument, null, 2),
  );

  log('✓ DID document saved to: did.json', 'green');

  const actualDomain = domain.replace(/%3A/g, ':');
  const protocol = actualDomain.includes('localhost') ? 'http' : 'https';

  log('\n📋 Next steps for deployment:', 'cyan');
  log(
    `   1. Upload did.json to: ${protocol}://${actualDomain}/.well-known/did.json`,
    'yellow',
  );
  log(
    `   2. Ensure CORS is enabled (Access-Control-Allow-Origin: *)`,
    'yellow',
  );
  log(
    `   3. Verify with: curl ${protocol}://${actualDomain}/.well-known/did.json`,
    'yellow',
  );

  return { didDocument, did };
}
