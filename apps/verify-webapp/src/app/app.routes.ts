import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadChildren: async () =>
      (await import('@c2pa-mcnl/verify-webapp/validate/feature/shell')).routes,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
