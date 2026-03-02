import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'lib-verify-webapp-shared-ui-layout-header',
  templateUrl: './verify-webapp-shared-ui-layout-header.component.html',
  imports: [NgOptimizedImage, RouterLink],
})
export class VerifyWebappSharedUiLayoutHeaderComponent {
  readonly elementHeight = 63;
}
