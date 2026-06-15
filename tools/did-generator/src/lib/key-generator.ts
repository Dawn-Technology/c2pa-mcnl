import crypto from 'node:crypto';
import { header, log } from '@c2pa-mcnl/shared/utils/cli';
import path from 'node:path';
import fs from 'node:fs';

export function generateKeys(outputDir: string) {
  header('Step 1: Generating Keys');

  // log('Generating Ed25519 key pair...', 'yellow');
  // const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {

  log('Generating ES256 (P-256) key pair...', 'yellow');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  // Save PEM files
  fs.writeFileSync(path.join(outputDir, 'private-key.pem'), privateKey);
  fs.writeFileSync(path.join(outputDir, 'public-key.pem'), publicKey);

  // Convert to JWK for DID document
  const publicKeyObject = crypto.createPublicKey(publicKey);
  const jwk = publicKeyObject.export({ format: 'jwk' });
  fs.writeFileSync(
    path.join(outputDir, 'public-key.jwk'),
    JSON.stringify(jwk, null, 2),
  );

  // Extract raw private key for ES256Signer
  const privateKeyObject = crypto.createPrivateKey(privateKey);
  const privateKeyJwk = privateKeyObject.export({ format: 'jwk' });

  if (!privateKeyJwk.d) {
    throw new Error('Failed to extract private key from JWK');
  }

  // For ES256, the 'd' parameter in JWK is the private key (base64url encoded)
  const privateKeyBytes = Buffer.from(privateKeyJwk.d, 'base64url');
  const privateKeyHex = privateKeyBytes.toString('hex');

  fs.writeFileSync(path.join(outputDir, 'private-key.hex'), privateKeyHex);

  log('✓ Private key saved to: private-key.pem', 'green');
  log('✓ Public key saved to: public-key.pem', 'green');
  log('✓ Public key JWK saved to: public-key.jwk', 'green');
  log('✓ Private key hex saved to: private-key.hex', 'green');

  log(
    '\n⚠️  IMPORTANT: Keep private-key.pem and private-key.hex secure!',
    'red',
  );

  return { publicKey, privateKey, jwk, privateKeyHex };
}
