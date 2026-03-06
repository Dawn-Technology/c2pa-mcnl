import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { VerifyWebappSharedUiLayoutHeaderComponent } from '@c2pa-mcnl/verify-webapp/shared/ui/layout-header';

@Component({
  imports: [RouterModule, VerifyWebappSharedUiLayoutHeaderComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
