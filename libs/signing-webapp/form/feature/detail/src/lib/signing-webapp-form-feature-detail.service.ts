import { Injectable } from '@angular/core';
import {
  createX509CertFromFile,
  extractDerFromFile,
  isImageMimeType,
} from '@c2pa-mcnl/shared/utils/helpers';
import { ActionType, ThumbnailType } from '@dawn-technology/c2pa-ts/manifest';
import { LocalSigner } from '@dawn-technology/c2pa-ts/cose';
import { LocalTimestampProvider } from '@dawn-technology/c2pa-ts/rfc3161';
import {
  LocalIdentitySigner,
  NamedActorRole,
  VerifiedIdentityType,
} from '@dawn-technology/c2pa-ts/cawg';
import {
  ActionAssertionFactory,
  IdentityAssertionFactory,
  IngredientAssertionFactory,
  ManifestFactory,
  ThumbnailAssertionFactory,
} from '@dawn-technology/c2pa-ts/factory';
import { generateThumbnail } from '@c2pa-mcnl/verify-webapp/shared/utils/helpers';
import { X509Certificate } from '@peculiar/x509';

/**
 * @property assetFile - The image file to which the C2PA manifest will be added
 * @property leafCertificateFile - The PEM file containing the leaf X.509 certificate for signing
 * @property leafCertificateKeyFile - The PEM file containing the private key corresponding to the leaf certificate
 * @property intermediateCertificate - The PEM file containing the intermediate X.509 certificate (if applicable)
 */
interface CreateC2paManifestOptions {
  assetFile: File;
  leafCertificateFile: File;
  leafCertificateKeyFile: File;
  intermediateCertificate?: File | null;
  verifiableCredentialPrivateKeyFile?: File | null;
  actions?: ActionType[];
  verifiableCredentialIssuer?: string;
}

@Injectable()
export class SigningWebappFormFeatureDetailService {
  /**
   * Builds a C2PA manifest with the provided certificates and asset, embeds it into the asset's JUMBF box, and returns the modified asset data.
   * @param opts - An object containing the asset file, certificate files, and optional actions to include in the manifest
   * @returns A File containing the modified asset data with the embedded C2PA manifest
   */
  async createC2paManifest(opts: CreateC2paManifestOptions): Promise<File> {
    const { signer, timestampProvider, digitalIdentitySigner } =
      await this.createSigners(opts);

    const { manifestStore, manifest, previousManifest, asset } =
      await ManifestFactory.build(opts.assetFile, signer);

    if (isImageMimeType(opts.assetFile)) {
      await ThumbnailAssertionFactory.add(
        manifest,
        await generateThumbnail(opts.assetFile),
        ThumbnailType.Claim,
      );
      await ThumbnailAssertionFactory.add(
        manifest,
        await generateThumbnail(opts.assetFile),
        ThumbnailType.Ingredient,
      );
    }
    await IngredientAssertionFactory.add(
      manifest,
      opts.assetFile,
      previousManifest,
    );
    ActionAssertionFactory.add(manifest, opts.actions);

    if (digitalIdentitySigner) {
      await IdentityAssertionFactory.add(
        manifest,
        asset,
        signer,
        digitalIdentitySigner,
        timestampProvider,
      );
    }

    return ManifestFactory.finish(
      asset,
      manifestStore,
      manifest,
      signer,
      opts.assetFile.name,
      timestampProvider,
    );
  }

  /**
   * Reads the leaf certificate, private key, and intermediate certificate from the provided PEM files,
   * and creates a LocalSigner and LocalTimestampProvider for signing the manifest.
   */
  private async createSigners(opts: CreateC2paManifestOptions) {
    const leafCertificate = await createX509CertFromFile(
      opts.leafCertificateFile,
    );
    const leafKeyDer = await extractDerFromFile(opts.leafCertificateKeyFile);

    const certChain: X509Certificate[] = [];
    if (opts.intermediateCertificate) {
      certChain.push(
        await createX509CertFromFile(opts.intermediateCertificate),
      );
    }

    const signer = new LocalSigner(leafKeyDer, leafCertificate, certChain);

    const timestampProvider = new LocalTimestampProvider(
      leafCertificate,
      leafKeyDer,
      certChain,
    );

    let digitalIdentitySigner;
    if (opts.verifiableCredentialPrivateKeyFile) {
      const digitalIdentityDer = await extractDerFromFile(
        opts.verifiableCredentialPrivateKeyFile,
      );

      let issuerDid = opts.verifiableCredentialIssuer;
      if (!issuerDid || issuerDid.startsWith('did:jwk')) {
        issuerDid = undefined;
      }

      digitalIdentitySigner = new LocalIdentitySigner(digitalIdentityDer, {
        verifiedIdentity: {
          type: VerifiedIdentityType.Affiliation,
          name: 'Sample Identity',
          provider: {
            id: `${window.location.origin}/.well-known/did.json`,
            name: 'C2PA MCNL - Signeer tool',
          },
          verifiedAt: new Date().toISOString(),
        },
        roles: [NamedActorRole.Publisher],
        issuerDid: issuerDid,
      });
    }

    return {
      signer,
      timestampProvider,
      digitalIdentitySigner,
    };
  }
}
