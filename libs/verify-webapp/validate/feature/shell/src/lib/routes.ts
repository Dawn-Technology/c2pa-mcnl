import { Route } from '@angular/router';

export const routes: Route[] = [
  {
    path: '',
    loadComponent: async () =>
      (await import('@c2pa-mcnl/verify-webapp/validate/feature/home'))
        .VerifyWebappValidateFeatureHomeComponent,
  },
  {
    path: 'verify',
    loadComponent: async () =>
      (await import('@c2pa-mcnl/verify-webapp/validate/feature/detail'))
        .VerifyWebappValidateFeatureDetailComponent,
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
