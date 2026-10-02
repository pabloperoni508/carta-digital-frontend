import { Component, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { supabase } from '../../core/supabase';
import { DiningTable, Order } from '../../core/models';
import { errorMessage, formatPrice, shortOrderId } from '../../core/format';
import { Alert, SectionHeader, Spinner } from '../../shared/ui';
import { ChartPoint, RevenueChart } from './revenue-chart';

const WEEKS = 11;
const DAY = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-admin-dashboard',
  imports: [SectionHeader, RevenueChart, Spinner, Alert],
  template: `
    <app-section-header title="Dashboard" subtitle="Resumen del estado actual del negocio" class="mb-6" />

    @if (error()) { <app-alert class="mb-6">{{ error() }}</app-alert> }

    @if (loading()) {
      <app-spinner />
    } @else {
      <div class="flex flex-col lg:flex-row gap-4 mb-8">
        <div class="bg-warm-surface rounded-2xl border border-amber/30 p-6 flex flex-col justify-between min-w-48">
          <p class="text-warm-muted text-xs uppercase tracking-wider">Recaudación semanal</p>
          <p class="font-display text-5xl font-bold text-amber mt-3">{{ fmt(weekRevenue()) }}</p>
          <p class="text-warm-muted text-xs mt-2">{{ weekDeltaLabel() }}</p>
        </div>
        <div class="flex gap-4 flex-1">
          @for (s of stats(); track s.label) {
            <div class="flex-1 rounded-2xl border p-5 flex flex-col justify-between min-w-0" [class]="s.bg">
              <p class="text-warm-muted text-xs uppercase tracking-wider">{{ s.label }}</p>
              <p class="font-display text-4xl font-bold mt-2" [class]="s.color">{{ s.value }}</p>
            </div>
          }
        </div>
      </div>

      <div class="bg-warm-surface rounded-2xl border border-warm-border p-5 mb-8">
        <div class="flex items-baseline justify-between mb-6">
          <div>
            <h3 class="font-display text-warm-fg font-semibold">Recaudación semanal</h3>
            <p class="text-warm-muted text-xs mt-0.5">Últimas {{ weeks }} semanas</p>
          </div>
          <span class="text-amber text-sm font-semibold">{{ fmt(chartTotal()) }}</span>
        </div>
        <app-revenue-chart [data]="chart()" />
      </div>

      <h3 class="text-warm-fg font-semibold mb-4">Estado de mesas</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
        @for (t of tableStatus(); track t.table.id) {
          <div class="rounded-2xl border p-4 flex flex-col gap-2"
            [class]="!t.table.is_active ? 'opacity-40 bg-warm-surface2 border-warm-border'
              : t.order ? 'bg-status-process/10 border-status-process/40' : 'bg-status-done/10 border-status-done/30'">
            <div class="flex items-center justify-between gap-2">
              <span class="font-display text-warm-fg font-bold text-sm truncate">{{ t.table.label }}</span>
              <span class="w-2 h-2 rounded-full shrink-0"
                [class]="!t.table.is_active ? 'bg-warm-muted' : t.order ? 'bg-status-process' : 'bg-status-done'"></span>
            </div>
            <span class="text-xs font-medium"
              [class]="!t.table.is_active ? 'text-warm-muted' : t.order ? 'text-status-process' : 'text-status-done'">
              {{ !t.table.is_active ? 'Inactiva' : t.order ? 'Pedido #' + shortId(t.order.id) : 'Libre' }}
            </span>
          </div>
        } @empty {
          <p class="text-warm-muted text-sm col-span-full">Todavía no hay mesas cargadas.</p>
        }
      </div>
    }`,
})
export class AdminDashboard {
  private auth = inject(AuthService);
  protected readonly fmt = formatPrice;
  protected readonly shortId = shortOrderId;
  protected readonly weeks = WEEKS;

  protected loading = signal(true);
  protected error = signal<string | null>(null);
  private orders = signal<Pick<Order, 'id' | 'total' | 'status' | 'created_at' | 'table_id'>[]>([]);
  private tables = signal<DiningTable[]>([]);
  private availability = signal<{ available: number; unavailable: number }>({ available: 0, unavailable: 0 });

  private sumBetween(from: number, to: number): number {
    return this.orders()
      .filter((o) => {
        const t = new Date(o.created_at).getTime();
        return t >= from && t < to;
      })
      .reduce((s, o) => s + Number(o.total), 0);
  }

  protected weekRevenue = computed(() => this.sumBetween(Date.now() - 7 * DAY, Date.now() + 1));
  protected weekDeltaLabel = computed(() => {
    const prev = this.sumBetween(Date.now() - 14 * DAY, Date.now() - 7 * DAY);
    if (prev === 0) return 'Últimos 7 días';
    const pct = Math.round(((this.weekRevenue() - prev) / prev) * 100);
    return `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)}% vs. semana anterior`;
  });

  protected stats = computed(() => [
    {
      label: 'En proceso',
      value: this.orders().filter((o) => o.status === 'en_proceso').length,
      color: 'text-status-process',
      bg: 'bg-status-process/10 border-status-process/30',
    },
    { label: 'Disponibles', value: this.availability().available, color: 'text-status-done', bg: 'bg-status-done/10 border-status-done/30' },
    { label: 'No disponibles', value: this.availability().unavailable, color: 'text-warm-muted', bg: 'bg-warm-surface2 border-warm-border' },
  ]);

  protected chart = computed<ChartPoint[]>(() => {
    const end = Date.now() + 1;
    return Array.from({ length: WEEKS }, (_, i) => {
      const to = end - (WEEKS - 1 - i) * 7 * DAY;
      const from = to - 7 * DAY;
      const d = new Date(from + DAY);
      return {
        label: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
        total: this.sumBetween(from, to),
      };
    });
  });
  protected chartTotal = computed(() => this.chart().reduce((s, p) => s + p.total, 0));

  protected tableStatus = computed(() =>
    this.tables().map((table) => ({
      table,
      order: this.orders().find((o) => o.table_id === table.id && o.status !== 'terminado') ?? null,
    })),
  );

  constructor() {
    effect(() => {
      const rid = this.auth.activeRestaurantId();
      if (rid) this.load(rid);
    });
  }

  private async load(rid: string) {
    this.loading.set(true);
    const since = new Date(Date.now() - WEEKS * 7 * DAY).toISOString();
    const [orders, tables, products] = await Promise.all([
      supabase.from('orders').select('id, total, status, created_at, table_id').eq('restaurant_id', rid).gte('created_at', since),
      supabase.from('tables').select('*').eq('restaurant_id', rid).order('label'),
      supabase.from('products').select('is_available').eq('restaurant_id', rid),
    ]);
    const err = orders.error ?? tables.error ?? products.error;
    if (err) this.error.set(errorMessage(err));
    this.orders.set(orders.data ?? []);
    this.tables.set(((tables.data ?? []) as DiningTable[]).sort((a, b) => a.label.localeCompare(b.label, 'es', { numeric: true })));
    const p = products.data ?? [];
    this.availability.set({
      available: p.filter((x) => x.is_available).length,
      unavailable: p.filter((x) => !x.is_available).length,
    });
    this.loading.set(false);
  }
}
