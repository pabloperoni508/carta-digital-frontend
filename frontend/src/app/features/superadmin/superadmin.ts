import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { supabase } from '../../core/supabase';
import { Restaurant } from '../../core/models';
import { errorMessage } from '../../core/format';
import { Alert, Icon, Spinner, Toggle } from '../../shared/ui';
import { StaffBar } from '../../shared/staff-bar';

@Component({
  selector: 'app-superadmin',
  imports: [StaffBar, Icon, Toggle, Spinner, Alert],
  template: `
    <div class="flex flex-col h-full">
      <app-staff-bar />
      <div class="flex-1 overflow-y-auto bg-warm-bg">
        <header class="px-6 py-8 border-b border-warm-border">
          <div class="flex items-center gap-3 mb-1">
            <div class="w-7 h-7 rounded-lg bg-amber flex items-center justify-center">
              <app-icon name="lock" [stroke]="2.5" class="w-4 h-4 text-amber-fg" />
            </div>
            <span class="text-warm-muted text-xs uppercase tracking-widest">Plataforma</span>
          </div>
          <h1 class="font-display text-3xl font-bold text-warm-fg">Superadmin</h1>
          <p class="text-warm-muted text-sm mt-1">Administrá los comercios registrados en la plataforma.</p>
        </header>

        <div class="flex gap-6 px-6 py-4 border-b border-warm-border overflow-x-auto">
          @for (s of stats(); track s.label) {
            <div class="shrink-0">
              <p class="font-display text-2xl font-bold text-amber">{{ s.value }}</p>
              <p class="text-warm-muted text-xs mt-0.5">{{ s.label }}</p>
            </div>
          }
        </div>

        <div class="p-6 space-y-4 max-w-3xl">
          @if (error()) { <app-alert [dismissible]="true" (dismissed)="error.set(null)">{{ error() }}</app-alert> }
          @if (loading()) {
            <app-spinner />
          } @else {
            @for (r of restaurants(); track r.id) {
              <div class="bg-warm-surface rounded-2xl border border-warm-border p-5 transition-opacity" [class.opacity-60]="!r.is_active">
                <div class="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <h2 class="font-display text-warm-fg font-bold text-lg">{{ r.name }}</h2>
                    <span class="inline-flex items-center gap-1.5 text-xs font-medium mt-1" [class]="r.is_active ? 'text-status-done' : 'text-warm-muted'">
                      <span class="w-1.5 h-1.5 rounded-full" [class]="r.is_active ? 'bg-status-done' : 'bg-warm-muted'"></span>
                      {{ r.is_active ? 'Activo' : 'Inactivo' }}
                    </span>
                    <span class="text-warm-muted text-xs font-mono ml-2">/{{ r.slug }}</span>
                  </div>
                  <div class="flex gap-2">
                    <button type="button" (click)="openPanel(r)"
                      class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border border-warm-border text-warm-fg hover:border-amber/50">
                      Abrir panel
                    </button>
                    <button type="button" (click)="update(r, { is_active: !r.is_active })"
                      class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                      [class]="r.is_active ? 'border-status-pending/40 text-status-pending hover:bg-status-pending/10' : 'border-status-done/40 text-status-done hover:bg-status-done/10'">
                      {{ r.is_active ? 'Desactivar comercio' : 'Activar comercio' }}
                    </button>
                  </div>
                </div>

                <div class="border-t border-warm-border pt-4">
                  <p class="text-warm-muted text-xs uppercase tracking-wider mb-3">Funcionalidades</p>
                  <div class="flex items-start gap-4">
                    <div class="flex-1">
                      <p class="text-warm-fg text-sm font-medium">Pedidos desde la mesa</p>
                      <p class="text-warm-muted text-xs mt-0.5 leading-relaxed">Permite a los clientes realizar pedidos directamente desde su teléfono vía NFC.</p>
                    </div>
                    <div class="flex flex-col items-end gap-1.5 shrink-0">
                      <app-toggle [on]="r.orders_enabled" (toggled)="update(r, { orders_enabled: !r.orders_enabled })" label="Pedidos desde la mesa" />
                      <span class="text-xs font-medium" [class]="r.orders_enabled ? 'text-amber' : 'text-warm-muted'">
                        {{ r.orders_enabled ? 'ACTIVADO' : 'DESACTIVADO' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            } @empty {
              <p class="text-warm-muted text-sm">No hay comercios registrados.</p>
            }
          }
        </div>
      </div>
    </div>`,
})
export class SuperadminPage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected restaurants = signal<Restaurant[]>([]);

  protected stats = computed(() => {
    const r = this.restaurants();
    return [
      { label: 'Comercios totales', value: r.length },
      { label: 'Activos', value: r.filter((x) => x.is_active).length },
      { label: 'Inactivos', value: r.filter((x) => !x.is_active).length },
      { label: 'Con pedidos en mesa', value: r.filter((x) => x.orders_enabled).length },
    ];
  });

  async ngOnInit() {
    const { data, error } = await supabase.from('restaurants').select('*').order('name');
    if (error) this.error.set(errorMessage(error));
    this.restaurants.set((data ?? []) as Restaurant[]);
    this.loading.set(false);
  }

  protected async update(r: Restaurant, patch: Partial<Pick<Restaurant, 'is_active' | 'orders_enabled'>>) {
    this.restaurants.update((list) => list.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from('restaurants').update(patch).eq('id', r.id);
    if (error) {
      this.error.set(errorMessage(error));
      this.restaurants.update((list) => list.map((x) => (x.id === r.id ? r : x)));
    }
  }

  protected openPanel(r: Restaurant) {
    this.auth.setActiveRestaurant(r.id);
    this.router.navigateByUrl('/admin');
  }
}
