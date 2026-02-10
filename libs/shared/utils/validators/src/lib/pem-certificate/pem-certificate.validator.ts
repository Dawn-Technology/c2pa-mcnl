import { SchemaPath, validateAsync } from '@angular/forms/signals';
import { resource } from '@angular/core';
import * as x509 from '@peculiar/x509';

export function pemCertificateValidator(field: SchemaPath<unknown>) {
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
            return { kind: 'pemCertificate', message: 'Must be a file' };
          }

          try {
            const pem = await params.text();
            new x509.X509Certificate(pem);
          } catch (e) {
            console.error(e);
            return {
              kind: 'pemCertificate',
              message: 'Enter a valid PEM certificate',
            };
          }

          return null;
        },
      }),
    onSuccess: (result) => result ?? null,
    onError: (error) => {
      console.error(error);
      return {
        kind: 'pemCertificate',
        message: 'Something went wrong during validation',
      };
    },
  });
}
