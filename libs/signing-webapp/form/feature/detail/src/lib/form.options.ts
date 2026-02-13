import { required, SchemaOrSchemaFn } from '@angular/forms/signals';
import {
  fileMimeTypeValidator,
  fileSizeValidator,
  pemCertificateValidator,
  pemKeyValidator,
} from '@c2pa-mcnl/shared/utils/validators';
import { MIME_TYPES } from '@c2pa-mcnl/shared/utils/constants';
import { FormData, VerifiableCredentialIssuer } from './form.model';

export const CERTIFICATE_MIME_TYPES = [
  MIME_TYPES.APPLICATION_X_X509_CA_CERT,
  MIME_TYPES.APPLICATION_X_PEM_FILE,
];

export const KEY_MIME_TYPES = [
  ...CERTIFICATE_MIME_TYPES,
  MIME_TYPES.APPLICATION_PKCS8,
  MIME_TYPES.APPLICATION_X_PKCS8,
  MIME_TYPES.TEXT_PLAIN,
];

export const ASSET_MIME_TYPES = [
  MIME_TYPES.IMAGE_JPEG,
  MIME_TYPES.IMAGE_PNG,
  MIME_TYPES.IMAGE_HEIC,
  MIME_TYPES.IMAGE_HEIF,
  MIME_TYPES.VIDEO_MP4,
  MIME_TYPES.AUDIO_MPEG,
];

export const CERTIFICATE_MAX_SIZE = 5 * 1024 * 1024;
export const KEY_MAX_SIZE = 5 * 1024 * 1024;
export const ASSET_MAX_SIZE = 1024 * 1024 * 1024;

export const VC_ISSUERS: VerifiableCredentialIssuer[] = [
  {
    name: 'VPRO',
    did: 'did:web:verifieermij.nl:vpro',
    site: 'https://verifieermij.nl',
  },
  {
    name: 'Media Campus Nederland',
    did: 'did:web:verifieermij.nl:mcnl',
    site: 'https://verifieermij.nl',
  },
  {
    name: 'Dawn Technology',
    did: 'did:web:verifieermij.nl:dawn-technology',
    site: 'https://verifieermij.nl',
  },
];

export const FormOptions: SchemaOrSchemaFn<FormData> = (schemaPath) => {
  /**
   * `leafCertificate` Validations
   */
  required(schemaPath.leafCertificate);
  pemCertificateValidator(schemaPath.leafCertificate);
  fileSizeValidator(schemaPath.leafCertificate, {
    maxSize: CERTIFICATE_MAX_SIZE,
  });
  fileMimeTypeValidator(schemaPath.leafCertificate, CERTIFICATE_MIME_TYPES);

  /**
   * `leafPrivateKey` Validations
   */
  required(schemaPath.leafPrivateKey);
  fileSizeValidator(schemaPath.leafPrivateKey, {
    maxSize: KEY_MAX_SIZE,
  });
  fileMimeTypeValidator(schemaPath.leafPrivateKey, KEY_MIME_TYPES);
  pemKeyValidator(schemaPath.leafPrivateKey);

  /**
   * `intermediateCertificate` Validations
   */
  required(schemaPath.intermediateCertificate);
  pemCertificateValidator(schemaPath.intermediateCertificate);
  fileSizeValidator(schemaPath.intermediateCertificate, {
    maxSize: CERTIFICATE_MAX_SIZE,
  });
  fileMimeTypeValidator(
    schemaPath.intermediateCertificate,
    CERTIFICATE_MIME_TYPES,
  );

  /**
   * `verifiableCredentialIssuer` Validations
   */
  required(schemaPath.verifiableCredentialIssuer);

  /**
   * `verifiableCredentialPrivateKey` Validations
   */
  required(schemaPath.verifiableCredentialPrivateKey);
  fileSizeValidator(schemaPath.verifiableCredentialPrivateKey, {
    maxSize: KEY_MAX_SIZE,
  });
  fileMimeTypeValidator(
    schemaPath.verifiableCredentialPrivateKey,
    KEY_MIME_TYPES,
  );
  pemKeyValidator(schemaPath.verifiableCredentialPrivateKey);

  /**
   * `assetFile` Validations
   */
  required(schemaPath.assetFile);
  fileSizeValidator(schemaPath.assetFile, {
    maxSize: ASSET_MAX_SIZE,
  });
  fileMimeTypeValidator(schemaPath.assetFile, ASSET_MIME_TYPES);
};
