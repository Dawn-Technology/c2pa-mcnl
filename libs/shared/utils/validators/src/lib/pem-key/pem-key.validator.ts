import { SchemaPath, validateAsync } from '@angular/forms/signals';
import { resource } from '@angular/core';
import { extractDerFromFile } from '@c2pa-mcnl/shared/utils/helpers';
import { Sequence, fromBER, ObjectIdentifier } from 'asn1js';

export interface Pkcs8ValidationResult {
  validPkcs8: boolean;
  algorithmOid?: string;
  algorithm?: string;
  signingCapable: boolean;
  error?: string;
}

const SIGNING_ALGORITHMS: Record<string, string> = {
  '1.2.840.113549.1.1.1': 'RSA',
  '1.2.840.10045.2.1': 'EC',
  '1.3.101.112': 'Ed25519',
  '1.3.101.113': 'Ed448',
};

export const errorMessage =
  'Must be a valid PKCS#8 PEM-encoded private key with signing capability';

export function pemKeyValidator(field: SchemaPath<unknown>) {
  validateAsync(field, {
    params: ({ value }) => value(),
    factory: (params) =>
      resource({
        params,
        loader: async ({ params }) => {
          if (!params) {
            return null;
          }

          if (!(params instanceof File)) {
            return { kind: 'pemKey', message: 'Must be a file' };
          }

          try {
            const der = await extractDerFromFile(params);
            const info = inspectPkcs8(der);

            if (!info.validPkcs8) {
              throw new Error(info.error);
            }

            if (info.algorithm) {
              const usable = await verifySigningImport(der, info.algorithm);

              if (!usable) {
                throw new Error('Key is not signing capable');
              }
            } else {
              throw new Error('No algorithm OID found in PKCS#8 structure');
            }
          } catch {
            return {
              kind: 'pemKey',
              message: errorMessage,
            };
          }
          return null;
        },
      }),
    onSuccess: (result) => result ?? null,
    onError: () => {
      return {
        kind: 'pemKey',
        message: 'Something went wrong during validation',
      };
    },
  });
}

export function inspectPkcs8(
  der: Uint8Array<ArrayBuffer>,
): Pkcs8ValidationResult {
  try {
    const parsed = fromBER(der);

    if (parsed.offset === -1) {
      return {
        validPkcs8: false,
        signingCapable: false,
        error: 'Invalid DER encoding',
      };
    }

    const root = parsed.result;

    if (!(root instanceof Sequence)) {
      return {
        validPkcs8: false,
        signingCapable: false,
        error: 'Root element is not a SEQUENCE',
      };
    }

    const elements = root.valueBlock.value;

    if (elements.length < 3) {
      return {
        validPkcs8: false,
        signingCapable: false,
        error: 'Not a valid PKCS#8 structure',
      };
    }

    const algorithmIdentifier = elements[1];

    if (!(algorithmIdentifier instanceof Sequence)) {
      return {
        validPkcs8: false,
        signingCapable: false,
        error: 'Missing AlgorithmIdentifier',
      };
    }

    const oidNode = algorithmIdentifier.valueBlock.value[0];

    if (!(oidNode instanceof ObjectIdentifier)) {
      return {
        validPkcs8: false,
        signingCapable: false,
        error: 'Missing algorithm OID',
      };
    }

    const oid = oidNode.valueBlock.toString();
    const algorithm = SIGNING_ALGORITHMS[oid];

    return {
      validPkcs8: true,
      algorithmOid: oid,
      algorithm,
      signingCapable: Boolean(algorithm),
    };
  } catch (error) {
    return {
      validPkcs8: false,
      signingCapable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function verifySigningImport(
  der: Uint8Array<ArrayBuffer>,
  algorithm: string,
): Promise<boolean> {
  try {
    switch (algorithm) {
      case 'Ed25519':
        await crypto.subtle.importKey(
          'pkcs8',
          der,
          { name: 'Ed25519' },
          false,
          ['sign'],
        );
        return true;

      case 'EC':
        for (const curve of ['P-256', 'P-384', 'P-512']) {
          try {
            await crypto.subtle.importKey(
              'pkcs8',
              der,
              {
                name: 'ECDSA',
                namedCurve: curve,
              },
              false,
              ['sign'],
            );
            return true;
          } catch {
            // Try next curve
          }
        }
        return false;

      case 'RSA':
        for (const hash of ['SHA-256', 'SHA-384', 'SHA-512']) {
          try {
            await crypto.subtle.importKey(
              'pkcs8',
              der,
              {
                name: 'RSASSA-PKCS1-v1_5',
                hash,
              },
              false,
              ['sign'],
            );
            return true;
          } catch {
            // Try next hash
          }
        }
        return false;

      default:
        return false;
    }
  } catch {
    return false;
  }
}
