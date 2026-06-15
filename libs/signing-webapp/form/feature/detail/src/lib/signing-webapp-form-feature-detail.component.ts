import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  isDevMode,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { SigningWebappFormFeatureDetailService } from './signing-webapp-form-feature-detail.service';
import { form as signalForm, FormField } from '@angular/forms/signals';
import { SigningWebappFormUiUploadFileInputComponent } from '@c2pa-mcnl/signing-webapp/form/ui/upload-file-input';
import { FormModel } from './form.model';
import {
  ACTION_OPTIONS,
  CERTIFICATE_MAX_SIZE,
  CERTIFICATE_MIME_TYPES,
  FormOptions,
  KEY_MAX_SIZE,
  KEY_MIME_TYPES,
  VC_ISSUERS,
} from './form.options';
import { ActionType } from '@dawn-technology/c2pa-ts/manifest';
import { NgStyle } from '@angular/common';
import { SigningWebappFormUiFormGroup } from '@c2pa-mcnl/signing-webapp/form/ui/form-group';
import {
  ASSET_MAX_SIZE,
  ASSET_MIME_TYPES,
  MIME_TYPES,
} from '@c2pa-mcnl/shared/utils/constants';

interface DevPrefillFile {
  fileName: string;
  mimeType: string;
  content: string | ArrayBuffer;
}

@Component({
  standalone: true,
  selector: 'lib-signing-webapp-feature-signing-form',
  imports: [
    SigningWebappFormUiUploadFileInputComponent,
    FormField,
    NgStyle,
    SigningWebappFormUiFormGroup,
  ],
  templateUrl: './signing-webapp-form-feature-detail.component.html',
  providers: [SigningWebappFormFeatureDetailService],
})
export class SigningWebappFormFeatureDetailComponent
  implements AfterViewInit, OnDestroy
{
  private readonly service = inject(SigningWebappFormFeatureDetailService);

  readonly footerHeight = signal(0);
  private readonly footerEl = viewChild<ElementRef>('footer');
  private resizeObserver?: ResizeObserver;

  private readonly devPrefillFiles = {
    leafCertificate: {
      fileName: 'leaf-cert.pem',
      mimeType: MIME_TYPES.APPLICATION_X_PEM_FILE,
      content: `-----BEGIN CERTIFICATE-----
MIICUDCCAfagAwIBAgIBAzAKBggqhkjOPQQDAjBrMQswCQYDVQQGEwJOTDEVMBMG
A1UECBMMWnVpZC1Ib2xsYW5kMRMwEQYDVQQKEwpNeSBDb21wYW55MRYwFAYDVQQL
Ew1JVCBEZXBhcnRtZW50MRgwFgYDVQQDEw9JbnRlcm1lZGlhdGUgQ0EwHhcNMjYw
NTI3MTQxNzE5WhcNMjcwNTI3MTQxNzE5WjBjMQswCQYDVQQGEwJOTDEVMBMGA1UE
CBMMWnVpZC1Ib2xsYW5kMRMwEQYDVQQKEwpNeSBDb21wYW55MRYwFAYDVQQLEw1J
VCBEZXBhcnRtZW50MRAwDgYDVQQDEwdMZWFmIENBMFkwEwYHKoZIzj0CAQYIKoZI
zj0DAQcDQgAEMaFvjJGb8RFOOMCvzwSn6vTNwBfLce4FA4G2WwO9TS46uAdUTkon
QEQptaAitnv1dzJdisjarmkaensTmEh/RaOBkjCBjzAPBgNVHRMBAf8EBTADAgEA
MCwGA1UdJQEB/wQiMCAGCisGAQQBg+heAgEGCCsGAQUFBwMEBggrBgEFBQcDJDAO
BgNVHQ8BAf8EBAMCB4AwHQYDVR0OBBYEFNSFLRRnjip8RliZmsIgoP2p3IaAMB8G
A1UdIwQYMBaAFCpSFgmWmqFcSmuRA884zMMnBnIHMAoGCCqGSM49BAMCA0gAMEUC
IF7CBy3MkPkBZuYnUvm50jIpTRTdYgxMrAFA4zsLIZ8cAiEAg/fmjCTYJCrSTBDL
esE2/kF1yoe+WLA2t5Y6X61kCQ4=
-----END CERTIFICATE-----`,
    },
    leafPrivateKey: {
      fileName: 'leaf-private-key.pem',
      mimeType: MIME_TYPES.TEXT_PLAIN,
      content: `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg7yVwuX10r09ayL0O
X5lLC3ACOcyV19EuaoJxsu2JuK6hRANCAAQxoW+MkZvxEU44wK/PBKfq9M3AF8tx
7gUDgbZbA71NLjq4B1ROSidARCm1oCK2e/V3Ml2KyNquaRp6exOYSH9F
-----END PRIVATE KEY-----`,
    },
    intermediateCertificate: {
      fileName: 'intermediate-cert.pem',
      mimeType: MIME_TYPES.APPLICATION_X_PEM_FILE,
      content: `-----BEGIN CERTIFICATE-----
MIICVDCCAfmgAwIBAgIBAjAKBggqhkjOPQQDAjBjMQswCQYDVQQGEwJOTDEVMBMG
A1UECBMMWnVpZC1Ib2xsYW5kMRMwEQYDVQQKEwpNeSBDb21wYW55MRYwFAYDVQQL
Ew1JVCBEZXBhcnRtZW50MRAwDgYDVQQDEwdSb290IENBMB4XDTI2MDUyNzE0MTcx
OVoXDTI3MDUyNzE0MTcxOVowazELMAkGA1UEBhMCTkwxFTATBgNVBAgTDFp1aWQt
SG9sbGFuZDETMBEGA1UEChMKTXkgQ29tcGFueTEWMBQGA1UECxMNSVQgRGVwYXJ0
bWVudDEYMBYGA1UEAxMPSW50ZXJtZWRpYXRlIENBMFkwEwYHKoZIzj0CAQYIKoZI
zj0DAQcDQgAEgGC6NMKsB02Z7Sx1/H2YLRWxvwo1QzFGHJGndc6EsH5SdQQowTmk
c5UsAcaa60QXV9oW0i4tBFhYIswgyzEjUaOBlTCBkjASBgNVHRMBAf8ECDAGAQH/
AgECMCwGA1UdJQEB/wQiMCAGCisGAQQBg+heAgEGCCsGAQUFBwMEBggrBgEFBQcD
JDAOBgNVHQ8BAf8EBAMCAoQwHQYDVR0OBBYEFCpSFgmWmqFcSmuRA884zMMnBnIH
MB8GA1UdIwQYMBaAFP/1zcGeP+xdXeT/GS8HJCdpuYmcMAoGCCqGSM49BAMCA0kA
MEYCIQCEtp1iKs3U14dV7TDfj6R45lxwbthwXDmhRL7/ayB1hAIhAP4YSfISllC3
I6BI/SUaAy+adYahCUaFph/dYm1FK8NY
-----END CERTIFICATE-----`,
    },
    verifiableCredentialPrivateKey: {
      fileName: 'vc-private-key.pem',
      mimeType: MIME_TYPES.TEXT_PLAIN,
      content: `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgLuh7JNynvBSVEs5R
xAg2oNiVW+bAAFVmzE26sfS1CEOhRANCAAS3ukzde1el73WvNZsdF/v5kKl/3rsA
zGH8APsZpMMoeUQXGEYipO375Pds5j0kG4WiW0xyaQmfwI5yoikfs7/s
-----END PRIVATE KEY-----`,
    },
  } satisfies Record<string, DevPrefillFile>;

  certificateMimeTypes = CERTIFICATE_MIME_TYPES;
  certificateMaxSize = CERTIFICATE_MAX_SIZE;
  keyMimeTypes = KEY_MIME_TYPES;
  keyMaxSize = KEY_MAX_SIZE;
  verifiableCredentialPrivateKeyMimeTypes = KEY_MIME_TYPES;
  verifiableCredentialPrivateKeyMaxSize = KEY_MAX_SIZE;
  verifiableCredentialIssuers = VC_ISSUERS;
  assetMimeTypes = ASSET_MIME_TYPES;
  assetMaxSize = ASSET_MAX_SIZE;
  actionOptions = ACTION_OPTIONS;
  isDevelopmentMode = isDevMode();
  isPrefillLoading = false;

  signingModel = FormModel;
  signingForm = signalForm(this.signingModel, FormOptions);

  canVcBeGenerated = computed(() => {
    return (
      this.signingForm.verifiableCredentialIssuer().dirty() &&
      this.signingForm.verifiableCredentialIssuer().valid() &&
      this.signingForm.verifiableCredentialPrivateKey().dirty() &&
      this.signingForm.verifiableCredentialPrivateKey().valid()
    );
  });

  ngAfterViewInit(): void {
    const el = this.footerEl()?.nativeElement;
    if (!el) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.footerHeight.set(el.offsetHeight);
    });
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  async createAndSignManifest() {
    const model = this.signingModel();

    if (!model.assetFile || !model.leafCertificate || !model.leafPrivateKey) {
      console.error('One or more required fields are missing');
      return;
    }

    const file = await this.service.createC2paManifest({
      assetFile: model.assetFile,
      leafCertificateFile: model.leafCertificate,
      leafCertificateKeyFile: model.leafPrivateKey,
      intermediateCertificate: model.intermediateCertificate,
      verifiableCredentialPrivateKeyFile: model.verifiableCredentialPrivateKey,
      actions: model.actionsToBeAdded,
      verifiableCredentialIssuer: model.verifiableCredentialIssuer,
    });

    const blob = new Blob([new Uint8Array(file)], {
      type: model.assetFile.type || 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = model.assetFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async prefillDevelopmentData(): Promise<void> {
    if (!this.isDevelopmentMode || this.isPrefillLoading) {
      return;
    }

    this.isPrefillLoading = true;

    try {
      const [
        leafCertificate,
        leafPrivateKey,
        intermediateCertificate,
        verifiableCredentialPrivateKey,
      ] = [
        this.createPrefillFile(this.devPrefillFiles.leafCertificate),
        this.createPrefillFile(this.devPrefillFiles.leafPrivateKey),
        this.createPrefillFile(this.devPrefillFiles.intermediateCertificate),
        this.createPrefillFile(
          this.devPrefillFiles.verifiableCredentialPrivateKey,
        ),
      ];

      const defaultIssuerDid =
        this.verifiableCredentialIssuers.find(
          (issuer) => issuer.name === 'Lokale ontwikkeling',
        )?.did ??
        this.verifiableCredentialIssuers[0]?.did ??
        '';

      this.signingModel.update((model) => ({
        ...model,
        leafCertificate,
        leafPrivateKey,
        intermediateCertificate,
        verifiableCredentialPrivateKey,
        verifiableCredentialIssuer: defaultIssuerDid,
        actionsToBeAdded: this.actionOptions.map((option) => option.value),
      }));
    } catch (error) {
      console.error('Failed to prefill development form data', error);
    } finally {
      this.isPrefillLoading = false;
    }
  }

  isActionSelected(action: ActionType): boolean {
    return this.signingModel().actionsToBeAdded.includes(action);
  }

  toggleAction(action: ActionType): void {
    this.signingModel.update((model) => {
      const current = model.actionsToBeAdded;
      const updated = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...model, actionsToBeAdded: updated };
    });
  }
  private createPrefillFile(prefillFile: DevPrefillFile): File {
    return new File([prefillFile.content], prefillFile.fileName, {
      type: prefillFile.mimeType,
    });
  }

  private decodeBase64(base64: string): ArrayBuffer {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
  }
}
