import { required, SchemaOrSchemaFn } from '@angular/forms/signals';
import {
  fileMimeTypeValidator,
  fileSizeValidator,
  pemCertificateValidator,
  pemKeyValidator,
} from '@c2pa-mcnl/shared/utils/validators';
import {
  ASSET_MAX_SIZE,
  ASSET_MIME_TYPES,
  MIME_TYPES,
} from '@c2pa-mcnl/shared/utils/constants';
import { FormData, VerifiableCredentialIssuer } from './form.model';
import { ActionType } from '@dockbite/c2pa-ts/manifest';

export interface ActionOption {
  label: string;
  description: string;
  value: ActionType;
}

export const ACTION_OPTIONS: ActionOption[] = [
  {
    label: 'Edited',
    description: 'The asset was modified or edited',
    value: ActionType.C2paEdited,
  },
  {
    label: 'Cropped',
    description: 'The asset was cropped to a different frame or region',
    value: ActionType.C2paCropped,
  },
  {
    label: 'Filtered',
    description: 'A visual filter or effect was applied to the asset',
    value: ActionType.C2paFiltered,
  },
  {
    label: 'Color Adjustments',
    description: 'Color, brightness, contrast, or tone adjustments were made',
    value: ActionType.C2paColorAdjustments,
  },
  {
    label: 'Resized',
    description: 'The asset was scaled or resized',
    value: ActionType.C2paResized,
  },
  {
    label: 'Converted',
    description: 'The asset was converted to a different file format',
    value: ActionType.C2paConverted,
  },
  {
    label: 'Transcoded',
    description: 'The asset was transcoded (e.g. re-encoded video or audio)',
    value: ActionType.C2paTranscoded,
  },
  {
    label: 'Published',
    description: 'The asset was published or distributed',
    value: ActionType.C2paPublished,
  },
  {
    label: 'Watermarked',
    description: 'A visible or invisible watermark was applied to the asset',
    value: ActionType.C2paWatermarked,
  },
];

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

export const CERTIFICATE_MAX_SIZE = 5 * 1024 * 1024;
export const KEY_MAX_SIZE = 5 * 1024 * 1024;

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
  required(schemaPath.verifiableCredentialIssuer, {
    when: ({ valueOf }) => !!valueOf(schemaPath.verifiableCredentialPrivateKey),
  });

  /**
   * `verifiableCredentialPrivateKey` Validations
   */
  required(schemaPath.verifiableCredentialPrivateKey, {
    when: ({ valueOf }) => !!valueOf(schemaPath.verifiableCredentialIssuer),
  });
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
