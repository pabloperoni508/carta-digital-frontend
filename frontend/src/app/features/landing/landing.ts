import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { isSupabaseConfigured } from '../../core/supabase';
import { Alert, Icon } from '../../shared/ui';

/**
 * Página de entrada. En producción el cliente llega directo a /m/:tag desde el
 * NFC/QR; esta pantalla sirve para ingresar el código a mano y para el staff.
 */
@Component({
  selector: 'app-landing',
  imports: [RouterLink, Icon, Alert],
  template: `
    <div class="min-h-full flex flex-col items-center justify-center px-6 py-12">
      <div class="w-full max-w-sm">
        <div class="w-12 h-12 rounded-2xl bg-amber flex items-center justify-center mb-6">
          <app-icon name="nfc" class="w-6 h-6 text-amber-fg" />
        </div>
        <h1 class="font-display text-4xl font-bold leading-tight">Carta Digital</h1>
        <p class="text-warm-muted mt-2">Acercá tu teléfono al tag NFC de la mesa o escaneá el código QR para ver el menú y pedir.</p>

        @if (!configured) {
          <app-alert tone="info" class="mt-6">
            Falta configurar Supabase en <code class="text-warm-fg">src/environments/environment.ts</code>.
          </app-alert>
        }

        <form class="mt-8 bg-warm-surface border border-warm-border rounded-2xl p-5" (submit)="go($event)">
          <label for="tag" class="text-warm-muted text-xs uppercase tracking-wide mb-1.5 block">Código de la mesa</label>
          <input id="tag" type="text" placeholder="ej: bar-lindo-mesa-1" autocomplete="off"
            [value]="code()" (input)="code.set($any($event.target).value)" />
          <button type="submit" [disabled]="!code().trim()"
            class="w-full mt-4 py-3 rounded-xl bg-amber text-amber-fg font-semibold hover:bg-amber-light transition-colors disabled:bg-warm-surface2 disabled:text-warm-muted">
            Ver menú
          </button>
        </form>

        <a routerLink="/login"
          class="mt-6 flex items-center justify-between bg-warm-surface/50 border border-warm-border rounded-2xl px-5 py-4 hover:border-amber/50 transition-colors group">
          <span>
            <span class="block text-sm font-medium">Soy del staff</span>
            <span class="block text-warm-muted text-xs">Cocina, administración y plataforma</span>
          </span>
          <app-icon name="chevronRight" class="w-4 h-4 text-warm-muted group-hover:text-amber" />
        </a>
      </div>
    </div>`,
})
export class LandingPage {
  private router = inject(Router);
  protected code = signal('');
  protected configured = isSupabaseConfigured();

  go(e: Event) {
    e.preventDefault();
    const c = this.code().trim();
    if (c) this.router.navigate(['/m', c]);
  }
}
