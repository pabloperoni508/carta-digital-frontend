import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/format';
import { Alert, Icon } from '../../shared/ui';

@Component({
  selector: 'app-login',
  imports: [RouterLink, Icon, Alert],
  template: `
    <div class="min-h-full flex flex-col items-center justify-center px-6 py-12">
      <div class="w-full max-w-sm">
        <div class="flex items-center gap-3 mb-1">
          <div class="w-7 h-7 rounded-lg bg-amber flex items-center justify-center">
            <app-icon name="lock" [stroke]="2.5" class="w-4 h-4 text-amber-fg" />
          </div>
          <span class="text-warm-muted text-xs uppercase tracking-widest">Staff</span>
        </div>
        <h1 class="font-display text-3xl font-bold">Iniciar sesión</h1>
        <p class="text-warm-muted text-sm mt-1">Cocina, administración y superadmin.</p>

        <form class="mt-8 space-y-4" (submit)="submit($event)">
          <div>
            <label for="email" class="text-warm-muted text-xs uppercase tracking-wide mb-1.5 block">Email</label>
            <input id="email" type="email" autocomplete="email" placeholder="cocina@barlindo.test"
              [value]="email()" (input)="email.set($any($event.target).value)" required />
          </div>
          <div>
            <label for="password" class="text-warm-muted text-xs uppercase tracking-wide mb-1.5 block">Contraseña</label>
            <input id="password" type="password" autocomplete="current-password"
              [value]="password()" (input)="password.set($any($event.target).value)" required />
          </div>
          @if (error()) {
            <app-alert>{{ error() }}</app-alert>
          }
          <button type="submit" [disabled]="loading()"
            class="w-full py-3.5 rounded-xl bg-amber text-amber-fg font-semibold hover:bg-amber-light transition-colors disabled:opacity-60">
            {{ loading() ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>

        <a routerLink="/" class="block text-center text-warm-muted text-sm mt-6 hover:text-warm-fg">← Volver</a>
      </div>
    </div>`,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  protected email = signal('');
  protected password = signal('');
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  async submit(e: Event) {
    e.preventDefault();
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.signIn(this.email().trim(), this.password());
      const home = this.auth.homeRoute();
      if (home === '/login') {
        this.error.set('Tu usuario no tiene un rol asignado en ningún restaurante.');
        await this.auth.signOut();
        return;
      }
      this.router.navigateByUrl(home);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
