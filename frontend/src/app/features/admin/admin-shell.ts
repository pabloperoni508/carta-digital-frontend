import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { supabase } from '../../core/supabase';
import { Icon, IconName } from '../../shared/ui';
import { StaffBar } from '../../shared/staff-bar';

const NAV: { path: string; label: string; icon: IconName; exact: boolean }[] = [
  { path: '/admin', label: 'Dashboard', icon: 'home', exact: true },
  { path: '/admin/categorias', label: 'Categorías', icon: 'list', exact: false },
  { path: '/admin/productos', label: 'Productos', icon: 'box', exact: false },
  { path: '/admin/mesas', label: 'Mesas / NFC', icon: 'nfc', exact: false },
];

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, StaffBar],
  template: `
    <div class="flex flex-col h-full">
      <app-staff-bar />
      <div class="flex flex-1 min-h-0 bg-warm-bg relative">
        @if (sidebarOpen()) {
          <div class="absolute inset-0 bg-black/50 z-30 lg:hidden fade-in" (click)="sidebarOpen.set(false)"></div>
        }
        <aside class="absolute lg:static z-40 shrink-0 w-56 h-full bg-warm-surface border-r border-warm-border flex flex-col transition-transform duration-200"
          [class]="sidebarOpen() ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'">
          <div class="px-5 py-6 border-b border-warm-border">
            <h1 class="font-display text-xl font-bold text-warm-fg truncate">{{ restaurantName() || '—' }}</h1>
            <p class="text-warm-muted text-xs mt-0.5 uppercase tracking-widest">Administración</p>
          </div>
          <nav class="flex-1 p-3 space-y-1">
            @for (item of nav; track item.path) {
              <a [routerLink]="item.path" routerLinkActive="!bg-amber !text-amber-fg"
                [routerLinkActiveOptions]="{ exact: item.exact }" (click)="sidebarOpen.set(false)"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-warm-muted hover:text-warm-fg hover:bg-warm-surface2">
                <app-icon [name]="item.icon" [stroke]="1.8" class="w-4 h-4" />
                {{ item.label }}
              </a>
            }
          </nav>
        </aside>

        <main class="flex-1 flex flex-col min-w-0">
          <div class="shrink-0 flex items-center gap-3 px-4 py-4 border-b border-warm-border lg:hidden">
            <button type="button" (click)="sidebarOpen.set(true)" class="text-warm-muted hover:text-warm-fg p-1" aria-label="Abrir menú">
              <app-icon name="menu" class="w-5 h-5" />
            </button>
            <span class="text-warm-fg font-semibold text-sm">{{ restaurantName() }}</span>
          </div>
          <div class="flex-1 overflow-y-auto p-6">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>`,
})
export class AdminShell {
  private auth = inject(AuthService);
  protected nav = NAV;
  protected sidebarOpen = signal(false);
  protected restaurantName = signal('');

  constructor() {
    effect(async () => {
      const rid = this.auth.activeRestaurantId();
      if (!rid) return;
      const { data } = await supabase.from('restaurants').select('name').eq('id', rid).maybeSingle();
      this.restaurantName.set(data?.name ?? '');
    });
  }
}
