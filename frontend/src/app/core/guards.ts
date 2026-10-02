import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Requiere un usuario logueado con alguno de los roles indicados. */
export function roleGuard(...allowed: Array<'superadmin' | 'admin' | 'kitchen'>): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.init();

    if (!auth.isLoggedIn()) return router.parseUrl('/login');

    const ok =
      (allowed.includes('superadmin') && auth.isSuperadmin()) ||
      (allowed.includes('admin') && auth.activeRole() === 'admin') ||
      (allowed.includes('kitchen') && !!auth.activeRole());

    return ok ? true : router.parseUrl(auth.homeRoute() === '/login' ? '/sin-acceso' : auth.homeRoute());
  };
}

/** En /login: si ya hay sesión, ir directo al panel correspondiente. */
export const loginGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.init();
  if (auth.isLoggedIn() && auth.homeRoute() !== '/login') return router.parseUrl(auth.homeRoute());
  return true;
};
