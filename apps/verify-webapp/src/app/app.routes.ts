import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: async () =>
      (await import('@c2pa-mcnl/verify-webapp/home/feature/detail'))
        .VerifyWebappHomeFeatureDetail,
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
