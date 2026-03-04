import { Component, input } from '@angular/core';

@Component({
  selector: 'lib-verify-webapp-shared-ui-loading-overlay',
  imports: [],
  templateUrl: './verify-webapp-shared-ui-loading-overlay.component.html',
  styleUrl: './verify-webapp-shared-ui-loading-overlay.component.css',
})
export class VerifyWebappSharedUiLoadingOverlayComponent {
  shown = input(false);
}
