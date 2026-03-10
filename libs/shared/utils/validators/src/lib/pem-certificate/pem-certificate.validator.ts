import { SchemaPath, validateAsync } from '@angular/forms/signals';
import { resource } from '@angular/core';
import { createX509CertFromFile } from '@c2pa-mcnl/shared/utils/helpers';

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
            await createX509CertFromFile(params);
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
