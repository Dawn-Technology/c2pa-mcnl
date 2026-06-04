import fs from 'node:fs';
import path from 'node:path';
import { EdDSASigner, ES256Signer } from 'did-jwt';
import { createVerifiableCredentialJwt } from 'did-jwt-vc';
import { log } from '@c2pa-mcnl/shared/utils/cli';
import { collectCredentialData } from './credential-data-collector'; // Issue Employment Credential using did-jwt-vc

// Issue Employment Credential using did-jwt-vc
export async function issueCredential(
  issuerDID: string,
  credentialData: Awaited<ReturnType<typeof collectCredentialData>>,
  privateKeyHex: string,
  outputDir: string,
) {
  log('Step 3: Issuing Employment Credential (JWT)');

  log('Creating credential payload...', 'yellow');

  const subjectDID =
    credentialData.subjectDID || `did:example:employee${Date.now()}`;

  // Create the VC payload
  const vcPayload = {
    sub: subjectDID,
    nbf: Math.floor(Date.now() / 1000), // Not before (now)
    exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // Expires in 1 year
    vc: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'EmploymentCredential'],
      credentialSubject: {
        id: subjectDID,
        name: credentialData.name,
        employedBy: credentialData.company,
        role: credentialData.role,
        department: credentialData.department,
        employeeId: credentialData.employeeId,
        startDate: credentialData.startDate,
      },
    },
  };

  log('Signing credential with did-jwt-vc...', 'yellow');

  // // Create signer from private key - EdDSASigner expects Uint8Array, not hex string
  // const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
  // const signer = EdDSASigner(privateKeyBytes);

  // Create signer from private key - ES256Signer expects Uint8Array, not hex string
  const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
  const signer = ES256Signer(privateKeyBytes);

  // Create issuer object
  const issuer = {
    did: issuerDID,
    signer,
  };

  // Sign the credential
  const vcJwt = await createVerifiableCredentialJwt(vcPayload, issuer);

  log('✓ Credential signed successfully!', 'green');

  // Save JWT credential
  const jwtFilename = `credential-${credentialData.employeeId || Date.now()}.jwt`;
  fs.writeFileSync(path.join(outputDir, jwtFilename), vcJwt);
  log(`✓ JWT credential saved to: ${jwtFilename}`, 'green');

  // Also save as JSON with embedded JWT (some wallets prefer this format)
  const vcJson = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'EmploymentCredential'],
    issuer: issuerDID,
    issuanceDate: new Date(vcPayload.nbf * 1000).toISOString(),
    expirationDate: new Date(vcPayload.exp * 1000).toISOString(),
    credentialSubject: vcPayload.vc.credentialSubject,
    proof: {
      type: 'JwtProof2020',
      jwt: vcJwt,
    },
  };

  const jsonFilename = `credential-${credentialData.employeeId || Date.now()}.json`;
  fs.writeFileSync(
    path.join(outputDir, jsonFilename),
    JSON.stringify(vcJson, null, 2),
  );
  log(`✓ JSON credential saved to: ${jsonFilename}`, 'green');

  // Decode JWT for display purposes
  const [, payload] = vcJwt.split('.');
  const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());

  // Create a summary file
  const summary = {
    format: 'JWT (JSON Web Token)',
    jwt: vcJwt.substring(0, 50) + '...',
    issuer: issuerDID,
    subject: subjectDID,
    employee: {
      name: credentialData.name,
      role: credentialData.role,
      company: credentialData.company,
      employeeId: credentialData.employeeId,
    },
    issuedAt: new Date(vcPayload.nbf * 1000).toISOString(),
    expiresAt: new Date(vcPayload.exp * 1000).toISOString(),
    verificationMethod: `${issuerDID}#key-1`,
  };

  fs.writeFileSync(
    path.join(outputDir, 'credential-summary.json'),
    JSON.stringify(summary, null, 2),
  );

  log('✓ Summary saved to: credential-summary.json', 'green');

  return { vcJwt, vcJson, decodedPayload };
}
