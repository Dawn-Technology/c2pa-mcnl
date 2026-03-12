import * as cbor from 'cbor-x';

/**
 * Generates a COSE_Sign1 structure by signing the given payload with the provided private key.
 *
 * COSE_Sign1 structure: [protected, unprotected, payload, signature]
 *
 * @param payload - The data to be signed (e.g., the VC JSON as bytes)
 * @param privateKey - The ECDSA P-256 private key for signing
 * @param kid - The key identifier (e.g., the issuer's DID) to include in the unprotected header
 */
export async function generateCoseSign1(
  payload: Uint8Array,
  privateKey: CryptoKey,
  kid: string,
): Promise<Uint8Array> {
  // Protected header: { alg: ES256 (-7) }
  const protectedHeader = new Map<number, number>();
  protectedHeader.set(1, -7); // alg: ES256
  const protectedHeaderBytes = cbor.encode(protectedHeader);

  // Unprotected header: { kid }
  const kidBytes = new TextEncoder().encode(kid);
  const unprotectedHeader = new Map<number, Uint8Array>();
  unprotectedHeader.set(4, kidBytes); // kid as CBOR bstr

  // Sig_structure for signing: ["Signature1", protected, external_aad, payload]
  const sigStructure = [
    'Signature1',
    protectedHeaderBytes,
    new Uint8Array(0), // external_aad (empty)
    payload,
  ];
  const toBeSignedBuffer = cbor.encode(sigStructure);
  const toBeSigned: Uint8Array<ArrayBuffer> = new Uint8Array(
    new Uint8Array(toBeSignedBuffer).buffer,
  );

  // Sign with ECDSA
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    toBeSigned,
  );

  // Build COSE_Sign1: tag 18 + [protected, unprotected, payload, signature]
  const coseSign1Array = [
    protectedHeaderBytes,
    unprotectedHeader,
    payload,
    new Uint8Array(signature),
  ];

  // Encode with CBOR tag 18 (COSE_Sign1)
  return new cbor.Encoder({ tagUint8Array: false }).encode(
    new cbor.Tag(coseSign1Array, 18),
  );
}
