import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { supabase } from '../../core/supabase';
import { TableSessionService } from '../../core/table-session.service';
import { Category, Product, TableSession } from '../../core/models';
import { errorMessage, formatPrice } from '../../core/format';
import { Icon, Spinner } from '../../shared/ui';

interface SelectedItem {
  product: Product;
  quantity: number;
}

type SheetStep = 'select' | 'confirm' | 'success';

/**
 * Vista del cliente: se entra por /m/:tag (URL grabada en el NFC o QR de la mesa).
 * 1. resolve_nfc_tag → sesión temporal
 * 2. menú (RLS devuelve solo categorías activas y productos disponibles)
 * 3. create_order → el servidor calcula el total
 */
@Component({
  selector: 'app-menu',
  imports: [Icon, Spinner, RouterLink, NgTemplateOutlet],
  templateUrl: './menu.html',
})
export class MenuPage implements OnInit {
  /** Parámetro de ruta :tag */
  readonly tag = input.required<string>();

  private tableSession = inject(TableSessionService);

  protected readonly fmt = formatPrice;
  protected loading = signal(true);
  protected fatalError = signal<string | null>(null);
  protected session = signal<TableSession | null>(null);
  protected ordersEnabled = signal(true);
  protected categories = signal<Category[]>([]);
  protected products = signal<Product[]>([]);
  protected activeCategory = signal<string>('');

  // Bottom sheet
  protected sheetOpen = signal(false);
  protected step = signal<SheetStep>('select');
  protected search = signal('');
  protected selected = signal<Record<string, SelectedItem>>({});
  protected collapsed = signal<Record<string, boolean>>({});
  protected sending = signal(false);
  protected orderError = signal<string | null>(null);
  protected lastTotal = signal<number | null>(null);

  protected categoryProducts = computed(() =>
    this.products().filter((p) => p.category_id === this.activeCategory()),
  );
  /** Categorías que tienen al menos un producto disponible. */
  protected visibleCategories = computed(() =>
    this.categories().filter((c) => this.products().some((p) => p.category_id === c.id)),
  );
  protected selectedList = computed(() => Object.values(this.selected()));
  protected selectedCount = computed(() => this.selectedList().reduce((s, i) => s + i.quantity, 0));
  protected selectedTotal = computed(() =>
    this.selectedList().reduce((s, i) => s + Number(i.product.price) * i.quantity, 0),
  );
  protected searchResults = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return null;
    return this.products().filter((p) => p.name.toLowerCase().includes(q));
  });

  async ngOnInit() {
    try {
      const session = await this.tableSession.open(this.tag());
      this.session.set(session);
      const rid = session.restaurant.id;

      const [rest, cats, prods] = await Promise.all([
        supabase.from('restaurants').select('orders_enabled').eq('id', rid).maybeSingle(),
        supabase.from('categories').select('*').eq('restaurant_id', rid).order('sort_order'),
        supabase
          .from('products')
          .select('*')
          .eq('restaurant_id', rid)
          .eq('is_available', true)
          .order('sort_order'),
      ]);
      if (cats.error) throw cats.error;
      if (prods.error) throw prods.error;

      this.ordersEnabled.set(rest.data?.orders_enabled ?? true);
      this.categories.set(cats.data as Category[]);
      this.products.set(prods.data as Product[]);
      this.activeCategory.set(this.visibleCategories()[0]?.id ?? '');
    } catch (e) {
      this.fatalError.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected productsOf(categoryId: string): Product[] {
    return this.products().filter((p) => p.category_id === categoryId);
  }

  protected isSelected(id: string): boolean {
    return !!this.selected()[id];
  }

  protected qty(id: string): number {
    return this.selected()[id]?.quantity ?? 0;
  }

  protected toggleItem(product: Product): void {
    this.selected.update((prev) => {
      const next = { ...prev };
      if (next[product.id]) delete next[product.id];
      else next[product.id] = { product, quantity: 1 };
      return next;
    });
  }

  protected changeQty(id: string, delta: number): void {
    this.selected.update((prev) => {
      const item = prev[id];
      if (!item) return prev;
      const next = { ...prev };
      const q = item.quantity + delta;
      if (q <= 0) delete next[id];
      else next[id] = { ...item, quantity: q };
      return next;
    });
  }

  protected toggleCollapsed(id: string): void {
    this.collapsed.update((c) => ({ ...c, [id]: !c[id] }));
  }

  protected openSheet(): void {
    this.sheetOpen.set(true);
    this.step.set('select');
    this.orderError.set(null);
  }

  protected closeSheet(): void {
    if (this.sending()) return;
    this.sheetOpen.set(false);
    this.step.set('select');
  }

  protected async confirmOrder(): Promise<void> {
    const s = this.session();
    if (!s || this.sending()) return;
    this.sending.set(true);
    this.orderError.set(null);
    try {
      const result = await this.tableSession.createOrder(
        s.session_token,
        this.selectedList().map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
      );
      this.lastTotal.set(Number(result.total));
      this.step.set('success');
      setTimeout(() => {
        this.sheetOpen.set(false);
        this.step.set('select');
        this.selected.set({});
        this.search.set('');
      }, 2500);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'P0001' || code === 'P0002') this.tableSession.clear();
      if (code === 'P0004') this.ordersEnabled.set(false);
      this.orderError.set(errorMessage(e));
    } finally {
      this.sending.set(false);
    }
  }
}
