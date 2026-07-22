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
    path: 'about',
    loadComponent: async () =>
      (await import('@c2pa-mcnl/verify-webapp/validate/feature/about'))
        .VerifyWebappValidateFeatureAboutComponent,
    pathMatch: 'full',
  },
  {
    path: 'why',
    loadComponent: async () =>
      (await import('@c2pa-mcnl/verify-webapp/validate/feature/why'))
        .VerifyWebappValidateFeatureWhyComponent,
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
