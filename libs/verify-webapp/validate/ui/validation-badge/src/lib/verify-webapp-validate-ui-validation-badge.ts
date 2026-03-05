import { Component, input } from '@angular/core';

@Component({
  selector: 'lib-verify-webapp-validate-ui-validation-badge',
  templateUrl: './verify-webapp-validate-ui-validation-badge.html',
  styleUrl: './verify-webapp-validate-ui-validation-badge.css',
})
export class VerifyWebappValidateUiValidationBadge {
  valid = input.required<boolean>();
  textValid = input<string>('');
  textInvalid = input('Niet herkenbaar');
}
