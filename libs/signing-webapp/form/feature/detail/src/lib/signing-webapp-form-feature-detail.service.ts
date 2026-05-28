import { Injectable } from '@angular/core';
import {
  createX509CertFromFile,
  extractBase64FromPem,
  extractDerFromFile,
  generateCoseSign1,
  getImageXmpIdentifiers,
  isImageMimeType,
} from '@c2pa-mcnl/shared/utils/helpers';
import { addYears } from 'date-fns';

import { VerifiableCredentialIssuer } from './form.model';
import { Asset, createAsset } from '@dockbite/c2pa-ts/asset';
import {
  Action,
  ActionAssertion,
  ActionType,
  ClaimVersion,
  DataHashAssertion,
  IdentityAssertion,
  IngredientAssertion,
  Manifest,
  ManifestStore,
  RelationshipType,
  ThumbnailAssertion,
  ThumbnailType,
} from '@dockbite/c2pa-ts/manifest';
import { CoseAlgorithmIdentifier, LocalSigner } from '@dockbite/c2pa-ts/cose';
import { LocalTimestampProvider } from '@dockbite/c2pa-ts/rfc3161';
import { SuperBox } from '@dockbite/c2pa-ts/jumbf';
import {
  createDidJwk,
  getSignerPublicJwk,
  IdentityClaimsAggregation,
  NamedActorRole,
  SignatureType,
  VerifiedIdentityType,
} from '@dockbite/c2pa-ts/cawg';
import { generateThumbnail } from '@c2pa-mcnl/verify-webapp/shared/utils/helpers';
import * as x509 from '@peculiar/x509';

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
  actions?: ActionType[];
}

@Injectable()
export class SigningWebappFormFeatureDetailService {
  /**
   * Builds a C2PA manifest with the provided certificates and asset, embeds it into the asset's JUMBF box, and returns the modified asset data.
   * @param opts - An object containing the asset file, certificate files, and optional actions to include in the manifest
   * @returns A Uint8Array containing the modified asset data with the embedded C2PA manifest
   */
  async createC2paManifest(
    opts: CreateC2paManifestOptions,
  ): Promise<Uint8Array> {
    const { signer, timestampProvider } = await this.createSigners(opts);

    const { manifestStore, manifest, previousManifest, asset } =
      await this.buildManifest(opts.assetFile, signer);

    await this.addThumbnailAssertion(
      opts.assetFile,
      ThumbnailType.Claim,
      manifest,
    );
    await this.addThumbnailAssertion(
      opts.assetFile,
      ThumbnailType.Ingredient,
      manifest,
    );
    await this.addIngredientAssertion(
      opts.assetFile,
      manifest,
      previousManifest,
    );
    this.addActionAssertion(manifest, opts.actions || []);

    const dataHashAssertion = this.addDataHashAssertion(manifest);

    await this.addIdentityAssertion(
      asset,
      dataHashAssertion,
      manifestStore,
      manifest,
      signer,
      timestampProvider,
    );

    await this.signManifest(
      asset,
      dataHashAssertion,
      manifestStore,
      manifest,
      signer,
      timestampProvider,
    );

    // write the JUMBF box to the asset
    await asset.writeManifestJUMBF(manifestStore.getBytes());

    // export the modified file which now includes the manifest
    return asset.getDataRange();
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

    const certChain: x509.X509Certificate[] = [];
    if (opts.intermediateCertificate) {
      certChain.push(
        await createX509CertFromFile(opts.intermediateCertificate),
      );
    }

    const signer = new LocalSigner(
      leafKeyDer,
      CoseAlgorithmIdentifier.ES256,
      leafCertificate,
      certChain,
    );

    const timestampProvider = new LocalTimestampProvider(
      leafCertificate,
      leafKeyDer,
    );

    return { signer, timestampProvider };
  }

  /**
   * Loads the asset from the provided file, checks for existing C2PA manifest in a JUMBF box, and creates a new manifest if none exists.
   */
  private async buildManifest(file: File, signer: LocalSigner) {
    const instanceID = crypto.randomUUID();
    const asset = await createAsset(file);
    const jumbfBytes = await asset.getManifestJUMBF(); // depends on asset class

    let manifestStore: ManifestStore;
    let previousManifest: Manifest | undefined;
    if (jumbfBytes) {
      const superBox = SuperBox.fromBuffer(jumbfBytes);

      manifestStore = ManifestStore.read(superBox);
      previousManifest = manifestStore.getActiveManifest();

      console.debug(
        'existing manifest found, loading it into the manifest store',
      );
    } else {
      console.debug(
        'no existing manifest found, creating a new manifest store',
      );
      manifestStore = new ManifestStore();
    }

    const manifest: Manifest = manifestStore.createManifest({
      claimVersion: ClaimVersion.V2,
      assetFormat: file.type,
      instanceID,
      defaultHashAlgorithm: 'SHA-256',
      signer,
    });

    return { asset, manifestStore, previousManifest, manifest };
  }

  /**
   * Generates a thumbnail for the provided file and adds a ThumbnailAssertion to the manifest with the thumbnail data.
   */
  private async addThumbnailAssertion(
    file: File,
    type: ThumbnailType,
    manifest: Manifest,
  ) {
    try {
      if (!isImageMimeType(file)) {
        console.warn(
          'File type is not an image, skipping thumbnail generation',
        );
        return;
      }
      const thumbnail = await generateThumbnail(file, 250, 250);
      const thumbnailBytes = new Uint8Array(await thumbnail.arrayBuffer());
      const fileExtension = file.type.replace(/.*\//, '');

      manifest.addAssertion(
        ThumbnailAssertion.create(fileExtension, thumbnailBytes, type),
      );
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Builds an IngredientAssertion for the original asset file, including XMP metadata if available, and adds it to the manifest.
   * If a previous manifest exists, it links to it using the c2pa_manifest property.
   * The IngredientAssertion is also linked to the ActionAssertion via a ParentOf relationship.
   */
  private async addIngredientAssertion(
    file: File,
    manifest: Manifest,
    previousManifest: Manifest | undefined,
  ) {
    const { instanceID: xmpInstanceId, documentID: xmpDocumentID } =
      await getImageXmpIdentifiers(file);

    const ingredientAssertion = IngredientAssertion.create(
      file.name,
      file.type,
      xmpInstanceId || `urn:uuid:${crypto.randomUUID()}`,
      xmpDocumentID,
    );
    ingredientAssertion.relationship = RelationshipType.ParentOf;

    if (isImageMimeType(file)) {
      ingredientAssertion.thumbnail = manifest.createHashedReference(
        `c2pa.assertions/c2pa.thumbnail.ingredient.${file.type.replace(/.*\//, '')}`,
      );
    }

    if (previousManifest) {
      ingredientAssertion.instanceID = previousManifest.claim?.instanceID;
      ingredientAssertion.c2pa_manifest = manifest.createHashedReference(
        `/c2pa/${previousManifest.label}/c2pa.claim.v2`,
      );
    }

    manifest.addAssertion(ingredientAssertion);
  }

  /**
   * Builds an ActionAssertion indicating that the asset was opened, with the provided actions, and adds it to the manifest.
   */
  private addActionAssertion(manifest: Manifest, actions: ActionType[]) {
    const instanceID = manifest.claim?.instanceID;
    const actionAssertion = new ActionAssertion();
    const openedAction: Action = {
      action: ActionType.C2paOpened,
      instanceID,
      parameters: {
        ingredients: [
          manifest.createHashedReference(`c2pa.assertions/c2pa.ingredient`),
        ],
      },
    };

    actionAssertion.actions.push(openedAction);

    for (const action of actions) {
      if (action === ActionType.C2paOpened) continue; // already added

      actionAssertion.actions.push({
        action: action,
        instanceID,
      });
    }

    manifest.addAssertion(actionAssertion);
  }

  /**
   * Adds a DataHashAssertion to the manifest, which will be updated with the actual asset hash before signing.
   * This assertion provides a hard binding between the manifest and the asset content.
   */
  private addDataHashAssertion(manifest: Manifest) {
    const dataHashAssertion = DataHashAssertion.create('SHA-512');
    manifest.addAssertion(dataHashAssertion);
    return dataHashAssertion;
  }

  private async addIdentityAssertion(
    asset: Asset,
    dataHashAssertion: DataHashAssertion,
    manifestStore: ManifestStore,
    manifest: Manifest,
    signer: LocalSigner,
    timestampProvider: LocalTimestampProvider,
  ): Promise<IdentityAssertion> {
    // Setup veriables
    const ica = new IdentityClaimsAggregation(signer);

    // Create an ICA (identity claims aggregation) assertion with placeholder values
    const identityAssertion = new IdentityAssertion();
    // Set preliminary values with placeholder hash
    identityAssertion.setSignerPayload(
      [
        {
          url: `self#jumbf=c2pa.assertions/c2pa.hash.data`,
          hash: new Uint8Array(32).fill(0x00),
        },
      ],
      SignatureType.IdentityClaimsAggregation,
      [NamedActorRole.Creator],
    );
    // Reserve enough space up-front for the real COSE_Sign1 ICA credential.
    identityAssertion.setSignature(
      new Uint8Array(4096).fill(0xaa),
      new Uint8Array(256).fill(0x00),
      undefined,
      manifest,
    );

    // Add the ICA (identity claims aggregation) assertion to the manifest
    manifest.addAssertion(identityAssertion);

    // First signing pass populates claim assertion hashes used by hard-binding validation.
    await this.signManifest(
      asset,
      dataHashAssertion,
      manifestStore,
      manifest,
      signer,
      timestampProvider,
    );

    if (!manifest.claim) {
      throw new Error('Manifest claim is missing after signing');
    }
    const hardBindingRef = manifest.claim.assertions.find(
      (ref) =>
        ref.uri === `self#jumbf=c2pa.assertions/${dataHashAssertion.fullLabel}`,
    );
    if (!hardBindingRef) {
      throw new Error(
        'Hard binding reference not found in manifest claim assertions',
      );
    }

    // Update the ICA (identity claims aggregation) assertion with the correct hash
    identityAssertion.setSignerPayload(
      [
        {
          url: hardBindingRef.uri,
          hash: hardBindingRef.hash,
        },
      ],
      SignatureType.IdentityClaimsAggregation,
      [NamedActorRole.Creator],
    );

    const issuerPublicJwk: JsonWebKey | undefined =
      await getSignerPublicJwk(signer);
    const issuerDid: string | undefined = createDidJwk(issuerPublicJwk);
    const icaCredential = IdentityClaimsAggregation.createIcaCredential(
      issuerDid,
      {
        verifiedIdentities: [
          {
            type: VerifiedIdentityType.SocialMedia,
            name: 'Sample Creator',
            username: 'sample-creator',
            uri: 'https://example.com/sample-creator',
            provider: {
              id: 'https://example.com',
              name: 'Example Identity Provider',
            },
            verifiedAt: new Date().toISOString(),
          },
        ],
      },
      identityAssertion.signerPayload,
      new Date(),
    );
    const icaSignature = await ica.createIcaSignature(icaCredential);

    identityAssertion.setSignature(
      icaSignature,
      new Uint8Array(256).fill(0x00),
      undefined,
      manifest,
    );

    return identityAssertion;
  }

  /**
   * Signs the manifest and writes the manifest JUMBF box back into the asset.
   */
  private async signManifest(
    asset: Asset,
    dataHashAssertion: DataHashAssertion,
    manifestStore: ManifestStore,
    manifest: Manifest,
    signer: LocalSigner,
    timestampProvider: LocalTimestampProvider,
  ) {
    // make space in the asset
    await asset.ensureManifestSpace(manifestStore.measureSize());

    // update the hard binding
    await dataHashAssertion.updateWithAsset(asset);

    // create the signature
    await manifest.sign(signer, timestampProvider);
  }

  /**
   * Generates a Verifiable Credential (VC) in COSE_Sign1 format.
   *
   * Creates an Identity Claims Aggregation Credential (ICAC) following the CAWG specification,
   * signs it using ECDSA P-256, and encodes it as a CBOR COSE_Sign1 structure.
   *
   * @param verifiableCredentialIssuer - The issuer information including DID, name, and site
   * @param verifiableCredentialPrivateKey - The private key file in PEM format (PKCS#8) for signing
   * @returns An object containing the VC JSON and the COSE_Sign1 encoded VC as a Uint8Array
   */
  async generateVerifiableCredential(
    verifiableCredentialIssuer: VerifiableCredentialIssuer,
    verifiableCredentialPrivateKey: File,
    // TODO ADD ASSET HASH
  ): Promise<{ vcJson: object; coseSign1: Uint8Array }> {
    const pemText = await verifiableCredentialPrivateKey.text();
    const base64 = extractBase64FromPem(pemText);
    const derBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      derBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );

    const vcJson = {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        'https://cawg.io/identity/1.1/ica/context/',
      ],
      type: ['VerifiableCredential', 'IdentityClaimsAggregationCredential'],
      issuer: verifiableCredentialIssuer.did,
      issuanceDate: new Date().toISOString(),
      expirationDate: addYears(new Date(), 1).toISOString(),
      credentialSubject: {
        id: `${verifiableCredentialIssuer.did}:user:${crypto.randomUUID()}`,
        verifiedIdentities: [
          {
            type: 'cawg.affiliation',
            provider: {
              id: verifiableCredentialIssuer.site,
              name: verifiableCredentialIssuer.name,
            },
            verifiedAt: new Date().toISOString(),
          },
        ],
        c2paAsset: {
          sig_type: SignatureType.IdentityClaimsAggregation,
          referenced_assertions: [
            { url: 'self#jumbf=c2pa.assertions/c2pa.hash.data', hash: '...' },
          ],
        },
      },
    };

    const vcPayload = new TextEncoder().encode(JSON.stringify(vcJson));
    const coseSign1 = await generateCoseSign1(
      vcPayload,
      privateKey,
      verifiableCredentialIssuer.did,
    );

    console.debug('Generated VC JSON:', vcJson);
    console.log('Generated VC (COSE_Sign1):', coseSign1);

    return {
      vcJson,
      coseSign1,
    };
  }
}
