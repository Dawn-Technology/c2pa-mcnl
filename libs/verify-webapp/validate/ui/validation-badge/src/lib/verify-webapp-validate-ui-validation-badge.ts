import { Component, input } from '@angular/core';

export type ValidationBadgeState = 'valid' | 'invalid' | 'untrusted';

@Component({
  selector: 'lib-verify-webapp-validate-ui-validation-badge',
  templateUrl: './verify-webapp-validate-ui-validation-badge.html',
  styleUrl: './verify-webapp-validate-ui-validation-badge.css',
})
export class VerifyWebappValidateUiValidationBadge {
  state = input.required<ValidationBadgeState>();
  textValid = input<string>('');
  textInvalid = input('Gemanipuleerd');
  textUntrusted = input('Niet vertrouwd');

  statusLabel(): string {
    const state = this.state();

    if (state === 'invalid') {
      return this.textInvalid();
    }

    if (state === 'untrusted') {
      return this.textUntrusted();
    }

    return this.textValid();
  }
}
