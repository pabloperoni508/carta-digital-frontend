import { Routes } from '@angular/router';
import { loginGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  // Público
  { path: '', loadComponent: () => import('./features/landing/landing').then((m) => m.LandingPage) },
  // Cliente de mesa: URL que se graba en el NFC / QR → /m/<tag_uid>
  { path: 'm/:tag', loadComponent: () => import('./features/client/menu').then((m) => m.MenuPage) },

  // Staff
  { path: 'login', canActivate: [loginGuard], loadComponent: () => import('./features/auth/login').then((m) => m.LoginPage) },
  {
    path: 'cocina',
    canActivate: [roleGuard('kitchen', 'admin')],
    loadComponent: () => import('./features/kitchen/kitchen').then((m) => m.KitchenPage),
  },
  {
    path: 'admin',
    canActivate: [roleGuard('admin')],
    loadComponent: () => import('./features/admin/admin-shell').then((m) => m.AdminShell),
    children: [
      { path: '', loadComponent: () => import('./features/admin/dashboard').then((m) => m.AdminDashboard) },
      { path: 'categorias', loadComponent: () => import('./features/admin/categories').then((m) => m.AdminCategories) },
      { path: 'productos', loadComponent: () => import('./features/admin/products').then((m) => m.AdminProducts) },
      { path: 'mesas', loadComponent: () => import('./features/admin/tables').then((m) => m.AdminTables) },
    ],
  },
  {
    path: 'superadmin',
    canActivate: [roleGuard('superadmin')],
    loadComponent: () => import('./features/superadmin/superadmin').then((m) => m.SuperadminPage),
  },
  { path: 'sin-acceso', loadComponent: () => import('./features/auth/no-access').then((m) => m.NoAccessPage) },
  { path: '**', redirectTo: '' },
];
