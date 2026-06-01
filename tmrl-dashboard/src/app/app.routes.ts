import { Routes } from '@angular/router';

import { AppLayoutComponent } from './shared/components/app-layout/app-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page.component').then((module) => module.DashboardPageComponent),
      },
      {
        path: 'metrics',
        loadComponent: () => import('./features/metrics/metrics-page.component').then((module) => module.MetricsPageComponent),
      },
      {
        path: 'checkpoints',
        loadComponent: () =>
          import('./features/checkpoints/checkpoints-page.component').then((module) => module.CheckpointsPageComponent),
      },
      {
        path: 'sessions',
        loadComponent: () => import('./features/sessions/sessions-page.component').then((module) => module.SessionsPageComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings-page.component').then((module) => module.SettingsPageComponent),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
