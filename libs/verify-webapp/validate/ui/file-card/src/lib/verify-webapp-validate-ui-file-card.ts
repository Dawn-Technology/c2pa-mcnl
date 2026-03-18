import { Component, input } from '@angular/core';

@Component({
  selector: 'lib-verify-webapp-validate-ui-file-card',
  imports: [],
  templateUrl: './verify-webapp-validate-ui-file-card.html',
  styleUrl: './verify-webapp-validate-ui-file-card.css',
})
export class VerifyWebappValidateUiFileCard {
  fileUrl = input.required<string>();
  fileName = input<string>();
  subText = input<string>();
}
