import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { VerifyWebappSharedUiLayoutHeaderComponent } from '@c2pa-mcnl/verify-webapp/shared/ui/layout-header';
import { NgStyle } from '@angular/common';

@Component({
  imports: [RouterModule, VerifyWebappSharedUiLayoutHeaderComponent, NgStyle],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
