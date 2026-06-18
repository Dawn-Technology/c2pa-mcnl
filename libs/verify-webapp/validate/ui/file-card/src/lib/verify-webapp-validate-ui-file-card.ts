import { Component, input } from '@angular/core';

@Component({
  selector: 'lib-verify-webapp-validate-ui-file-card',
  imports: [],
  templateUrl: './verify-webapp-validate-ui-file-card.html',
  styleUrl: './verify-webapp-validate-ui-file-card.css',
})
export class VerifyWebappValidateUiFileCard {
  fileUrl = input<string | null>();
  fileName = input<string>();
  subText = input<string>();
  mimeType = input<string | null>();

  isVideoFile(): boolean {
    return this.mimeType()?.startsWith('video/') ?? false;
  }

  imageAltText(): string {
    const name = this.fileName()?.trim();
    return name ? `Voorbeeld van ${name}` : 'Voorbeeldbestand';
  }
}
