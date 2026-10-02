import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../core/supabase';
import { AuthService } from '../../core/auth.service';
import { OrderStatus, OrderWithDetails } from '../../core/models';
import { elapsedSince, errorMessage, formatTime, shortOrderId } from '../../core/format';
import { Alert, Spinner } from '../../shared/ui';
import { StaffBar } from '../../shared/staff-bar';

interface Column {
  id: OrderStatus;
  label: string;
  text: string;
  dot: string;
  header: string;
  btnLabel: string;
  btnClass: string;
  next: OrderStatus | null;
}

const COLUMNS: Column[] = [
  {
    id: 'pendiente', label: 'Pendientes', text: 'text-status-pending', dot: 'bg-status-pending',
    header: 'bg-status-pending/10 border-status-pending/30', btnLabel: 'Comenzar', next: 'en_proceso',
    btnClass: 'bg-status-process/20 text-status-process border border-status-process/40 hover:bg-status-process/30',
  },
  {
    id: 'en_proceso', label: 'En proceso', text: 'text-status-process', dot: 'bg-status-process',
    header: 'bg-status-process/10 border-status-process/30', btnLabel: 'Marcar terminado', next: 'terminado',
    btnClass: 'bg-status-done/20 text-status-done border border-status-done/40 hover:bg-status-done/30',
  },
  {
    id: 'terminado', label: 'Terminados', text: 'text-status-done', dot: 'bg-status-done',
    header: 'bg-status-done/10 border-status-done/30', btnLabel: '', next: null, btnClass: '',
  },
];

/** Los terminados se ven durante 7 minutos y después salen del tablero. */
const DONE_TTL_MS = 7 * 60 * 1000;

@Component({
  selector: 'app-kitchen',
  imports: [StaffBar, Spinner, Alert],
  templateUrl: './kitchen.html',
})
export class KitchenPage implements OnInit, OnDestroy {
  private auth = inject(AuthService);

  protected readonly columns = COLUMNS;
  protected readonly fmtTime = formatTime;
  protected readonly shortId = shortOrderId;

  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected orders = signal<OrderWithDetails[]>([]);
  protected now = signal(Date.now());
  protected draggingId = signal<string | null>(null);
  protected dragOver = signal<OrderStatus | null>(null);
  protected live = signal(false);
  protected restaurantName = computed(() => this.auth.activeMembership()?.restaurant?.name ?? '');

  protected visible = computed(() => {
    const now = this.now();
    return this.orders().filter(
      (o) => o.status !== 'terminado' || now - new Date(o.updated_at).getTime() < DONE_TTL_MS,
    );
  });
  protected pendingCount = computed(() => this.visible().filter((o) => o.status === 'pendiente').length);
  protected processCount = computed(() => this.visible().filter((o) => o.status === 'en_proceso').length);

  private channel: RealtimeChannel | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;
  private knownIds = new Set<string>();

  async ngOnInit() {
    await this.load();
    this.subscribe();
    this.timer = setInterval(() => this.now.set(Date.now()), 10_000);
  }

  ngOnDestroy() {
    if (this.channel) supabase.removeChannel(this.channel);
    if (this.timer) clearInterval(this.timer);
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
  }

  protected ordersIn(status: OrderStatus): OrderWithDetails[] {
    return this.visible()
      .filter((o) => o.status === status)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  protected elapsed(o: OrderWithDetails): string {
    return elapsedSince(o.created_at, this.now());
  }

  private get restaurantId(): string | null {
    return this.auth.activeRestaurantId();
  }

  private async load() {
    const rid = this.restaurantId;
    if (!rid) return;
    const since = new Date(Date.now() - DONE_TTL_MS).toISOString();
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), table:tables(label)')
      .eq('restaurant_id', rid)
      .or(`status.neq.terminado,updated_at.gte.${since}`)
      .order('created_at');
    this.loading.set(false);
    if (error) {
      this.error.set(errorMessage(error));
      return;
    }
    const list = (data ?? []) as OrderWithDetails[];
    const isFirstLoad = this.knownIds.size === 0 && this.orders().length === 0;
    const hasNew = list.some((o) => o.status === 'pendiente' && !this.knownIds.has(o.id));
    list.forEach((o) => this.knownIds.add(o.id));
    this.orders.set(list);
    this.now.set(Date.now());
    if (hasNew && !isFirstLoad) this.beep();
  }

  /** Realtime: ante cualquier cambio en pedidos del restaurante, recarga (con debounce). */
  private subscribe() {
    const rid = this.restaurantId;
    if (!rid) return;
    const reload = () => {
      if (this.reloadTimer) clearTimeout(this.reloadTimer);
      this.reloadTimer = setTimeout(() => this.load(), 250);
    };
    this.channel = supabase
      .channel(`cocina-${rid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${rid}` }, reload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items', filter: `restaurant_id=eq.${rid}` }, reload)
      .subscribe((status) => this.live.set(status === 'SUBSCRIBED'));
  }

  protected async setStatus(order: OrderWithDetails, status: OrderStatus) {
    if (order.status === status) return;
    const prev = this.orders();
    // Actualización optimista
    this.orders.update((list) =>
      list.map((o) => (o.id === order.id ? { ...o, status, updated_at: new Date().toISOString() } : o)),
    );
    const { error } = await supabase.rpc('set_order_status', { p_order_id: order.id, p_status: status });
    if (error) {
      this.orders.set(prev);
      this.error.set(errorMessage(error));
    }
  }

  // Drag & drop entre columnas
  protected onDragStart(id: string) {
    this.draggingId.set(id);
  }
  protected onDragOver(e: DragEvent, status: OrderStatus) {
    e.preventDefault();
    this.dragOver.set(status);
  }
  protected onDrop(e: DragEvent, status: OrderStatus) {
    e.preventDefault();
    const order = this.orders().find((o) => o.id === this.draggingId());
    if (order) this.setStatus(order, status);
    this.onDragEnd();
  }
  protected onDragEnd() {
    this.draggingId.set(null);
    this.dragOver.set(null);
  }

  private beep() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }
}
