import { SchemaPath, validateAsync } from '@angular/forms/signals';
import { resource } from '@angular/core';
import { extractBase64FromPem } from '@c2pa-mcnl/shared/utils/helpers';

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
            const base64 = extractBase64FromPem(await params.text());

            const der = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

            // validate the key by trying to import it using Web Crypto API
            await crypto.subtle.importKey(
              'pkcs8',
              der,
              {
                name: 'ECDSA',
                namedCurve: 'P-256',
              },
              true,
              ['sign'],
            );
          } catch (e) {
            console.error(e);
            return {
              kind: 'pemKey',
              message:
                'Must be a valid PKCS#8 PEM-encoded ECDSA private key using P-256 curve with signing capability',
            };
          }

          return null;
        },
      }),
    onSuccess: (result) => result ?? null,
    onError: (error) => {
      console.error(error);
      return {
        kind: 'pemKey',
        message: 'Something went wrong during validation',
      };
    },
  });
}
