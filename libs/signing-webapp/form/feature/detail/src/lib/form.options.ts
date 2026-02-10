import { required, SchemaOrSchemaFn } from '@angular/forms/signals';
import {
  fileMimeTypeValidator,
  fileSizeValidator,
  pemCertificateValidator,
  pemKeyValidator,
} from '@c2pa-mcnl/shared/utils/validators';
import { MIME_TYPES } from '@c2pa-mcnl/shared/utils/constants';
import { FormData } from './form.model';

export const CERTIFICATE_MIME_TYPES = [
  MIME_TYPES.APPLICATION_X_X509_CA_CERT,
  MIME_TYPES.APPLICATION_X_PEM_FILE,
];

export const DID_MIME_TYPES = [
  MIME_TYPES.APPLICATION_JSON,
  MIME_TYPES.APPLICATION_LD_JSON,
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
export const DID_MAX_SIZE = 2 * 1024 * 1024;
export const ASSET_MAX_SIZE = 1024 * 1024 * 1024;

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
    maxSize: CERTIFICATE_MAX_SIZE,
  });
  fileMimeTypeValidator(schemaPath.leafPrivateKey, CERTIFICATE_MIME_TYPES);
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
   * `didFile` Validations
   */
  required(schemaPath.didFile);
  fileSizeValidator(schemaPath.didFile, {
    maxSize: DID_MAX_SIZE,
  });
  fileMimeTypeValidator(schemaPath.didFile, DID_MIME_TYPES);

  /**
   * `assetFile` Validations
   */
  required(schemaPath.assetFile);
  fileSizeValidator(schemaPath.assetFile, {
    maxSize: ASSET_MAX_SIZE,
  });
  fileMimeTypeValidator(schemaPath.assetFile, ASSET_MIME_TYPES);
};
