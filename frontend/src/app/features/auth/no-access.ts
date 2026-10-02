import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-no-access',
  template: `
    <div class="min-h-full flex flex-col items-center justify-center text-center px-8 gap-3">
      <h1 class="font-display text-2xl font-bold">Sin acceso</h1>
      <p class="text-warm-muted text-sm max-w-xs">Tu usuario no tiene un rol asignado para esta sección.</p>
      <button type="button" (click)="logout()" class="text-amber text-sm font-medium hover:text-amber-light mt-2">Cerrar sesión</button>
    </div>`,
})
export class NoAccessPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  async logout() {
    await this.auth.signOut();
    this.router.navigateByUrl('/login');
  }
}
