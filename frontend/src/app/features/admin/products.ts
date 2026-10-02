import { Component, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { supabase } from '../../core/supabase';
import { Category, Product } from '../../core/models';
import { errorMessage, formatPrice } from '../../core/format';
import { Alert, Icon, SectionHeader, Spinner, Toggle } from '../../shared/ui';

interface ProductForm {
  name: string;
  description: string;
  price: number | null;
  category_id: string;
  image_url: string;
  is_available: boolean;
}

const EMPTY: ProductForm = { name: '', description: '', price: null, category_id: '', image_url: '', is_available: true };

@Component({
  selector: 'app-admin-products',
  imports: [SectionHeader, Icon, Alert, Spinner, Toggle],
  template: `
    <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
      <app-section-header title="Productos" subtitle="Gestioná los ítems del menú" />
      <div class="flex items-center gap-3">
        <select class="!w-auto !py-2 !px-3 text-sm" [value]="filterCat()" (change)="filterCat.set($any($event.target).value)">
          <option value="all">Todas las categorías</option>
          @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
        </select>
        <button type="button" (click)="openCreate()"
          class="flex items-center gap-2 px-4 py-2 bg-amber text-amber-fg rounded-xl text-sm font-semibold hover:bg-amber-light transition-colors whitespace-nowrap">
          <app-icon name="plus" class="w-4 h-4" /> Nuevo producto
        </button>
      </div>
    </div>

    @if (error()) { <app-alert class="mb-4" [dismissible]="true" (dismissed)="error.set(null)">{{ error() }}</app-alert> }

    @if (loading()) {
      <app-spinner />
    } @else {
      <div class="space-y-2">
        @for (product of filtered(); track product.id) {
          <div class="flex items-center gap-4 bg-warm-surface rounded-xl px-4 py-3 border border-warm-border transition-opacity"
            [class.opacity-50]="!product.is_available">
            <div class="w-12 h-12 rounded-lg overflow-hidden bg-warm-surface2 shrink-0 flex items-center justify-center">
              @if (product.image_url) {
                <img [src]="product.image_url" [alt]="product.name" class="w-full h-full object-cover" loading="lazy" />
              } @else {
                <span class="text-warm-muted text-xl">🍽</span>
              }
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-warm-fg text-sm font-medium truncate">{{ product.name }}</p>
              <p class="text-warm-muted text-xs">{{ categoryName(product.category_id) }}</p>
            </div>
            <span class="text-amber text-sm font-semibold hidden sm:block">{{ fmt(product.price) }}</span>
            <span class="text-xs px-2 py-0.5 rounded-full font-medium hidden md:block"
              [class]="product.is_available ? 'bg-status-done/10 text-status-done' : 'bg-warm-surface2 text-warm-muted'">
              {{ product.is_available ? 'Disponible' : 'No disponible' }}
            </span>
            <div class="flex items-center gap-2 ml-auto shrink-0">
              <button type="button" (click)="openEdit(product)" class="text-warm-muted text-xs hover:text-warm-fg px-2 py-1">Editar</button>
              <button type="button" (click)="toggleAvailable(product)"
                class="text-xs px-2 py-1 rounded-lg border transition-colors"
                [class]="product.is_available ? 'border-status-pending/30 text-status-pending hover:bg-status-pending/10' : 'border-status-done/30 text-status-done hover:bg-status-done/10'">
                {{ product.is_available ? 'Desactivar' : 'Activar' }}
              </button>
              <button type="button" (click)="remove(product)" class="text-warm-muted hover:text-status-pending px-1 py-1" aria-label="Eliminar">
                <app-icon name="trash" [stroke]="1.8" class="w-4 h-4" />
              </button>
            </div>
          </div>
        } @empty {
          <p class="text-warm-muted text-sm">No hay productos{{ filterCat() !== 'all' ? ' en esta categoría' : '' }}.</p>
        }
      </div>
    }

    @if (modalOpen()) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 fade-in" (click)="closeModal()">
        <form class="bg-warm-surface rounded-2xl border border-warm-border w-full max-w-md max-h-[90vh] flex flex-col sheet-enter sm:animate-none"
          (click)="$event.stopPropagation()" (submit)="save($event)">
          <div class="flex items-center justify-between px-6 py-4 border-b border-warm-border shrink-0">
            <h3 class="font-display text-warm-fg font-semibold">{{ editingId() ? 'Editar producto' : 'Nuevo producto' }}</h3>
            <button type="button" (click)="closeModal()" class="text-warm-muted hover:text-warm-fg" aria-label="Cerrar">
              <app-icon name="close" class="w-5 h-5" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <label class="text-warm-muted text-xs uppercase tracking-wide mb-1.5 block" for="p-name">Nombre</label>
              <input id="p-name" type="text" [value]="form().name" (input)="patch('name', $any($event.target).value)" placeholder="Ej: Milanesa napolitana" />
            </div>
            <div>
              <label class="text-warm-muted text-xs uppercase tracking-wide mb-1.5 block" for="p-desc">Descripción</label>
              <textarea id="p-desc" rows="2" class="resize-none" [value]="form().description"
                (input)="patch('description', $any($event.target).value)" placeholder="Ingredientes y características"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-warm-muted text-xs uppercase tracking-wide mb-1.5 block" for="p-price">Precio ($)</label>
                <input id="p-price" type="number" min="0" step="0.01" [value]="form().price ?? ''"
                  (input)="patch('price', $any($event.target).value === '' ? null : +$any($event.target).value)" placeholder="8500" />
              </div>
              <div>
                <label class="text-warm-muted text-xs uppercase tracking-wide mb-1.5 block" for="p-cat">Categoría</label>
                <select id="p-cat" [value]="form().category_id" (change)="patch('category_id', $any($event.target).value)">
                  <option value="">Seleccionar...</option>
                  @for (c of categories(); track c.id) { <option [value]="c.id" [selected]="c.id === form().category_id">{{ c.name }}</option> }
                </select>
              </div>
            </div>
            <div>
              <label class="text-warm-muted text-xs uppercase tracking-wide mb-1.5 block" for="p-img">URL de imagen</label>
              <input id="p-img" type="url" [value]="form().image_url" (input)="patch('image_url', $any($event.target).value)" placeholder="https://..." />
            </div>
            <div class="flex items-center justify-between py-2">
              <span class="text-warm-fg text-sm">Disponible</span>
              <app-toggle [on]="form().is_available" (toggled)="patch('is_available', !form().is_available)" label="Disponible" />
            </div>
            @if (formError()) { <app-alert>{{ formError() }}</app-alert> }
          </div>
          <div class="px-6 py-4 border-t border-warm-border flex gap-3 shrink-0">
            <button type="button" (click)="closeModal()" class="flex-1 py-3 border border-warm-border rounded-xl text-warm-muted text-sm font-medium hover:text-warm-fg">Cancelar</button>
            <button type="submit" [disabled]="saving()" class="flex-1 py-3 bg-amber text-amber-fg rounded-xl text-sm font-semibold hover:bg-amber-light disabled:opacity-60">
              {{ saving() ? 'Guardando...' : editingId() ? 'Guardar cambios' : 'Crear producto' }}
            </button>
          </div>
        </form>
      </div>
    }`,
})
export class AdminProducts {
  private auth = inject(AuthService);
  protected readonly fmt = formatPrice;
  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected products = signal<Product[]>([]);
  protected categories = signal<Category[]>([]);
  protected filterCat = signal('all');

  protected modalOpen = signal(false);
  protected editingId = signal<string | null>(null);
  protected form = signal<ProductForm>(EMPTY);
  protected formError = signal<string | null>(null);
  protected saving = signal(false);

  protected filtered = computed(() =>
    this.filterCat() === 'all' ? this.products() : this.products().filter((p) => p.category_id === this.filterCat()),
  );

  constructor() {
    effect(() => {
      if (this.auth.activeRestaurantId()) this.load();
    });
  }

  private get rid() {
    return this.auth.activeRestaurantId()!;
  }

  private async load() {
    const [p, c] = await Promise.all([
      supabase.from('products').select('*').eq('restaurant_id', this.rid).order('sort_order'),
      supabase.from('categories').select('*').eq('restaurant_id', this.rid).order('sort_order'),
    ]);
    if (p.error || c.error) this.error.set(errorMessage(p.error ?? c.error));
    this.categories.set((c.data ?? []) as Category[]);
    // Ordenados por categoría y luego por sort_order
    const catOrder = new Map(this.categories().map((cat, i) => [cat.id, i]));
    this.products.set(
      ((p.data ?? []) as Product[]).sort(
        (a, b) => (catOrder.get(a.category_id) ?? 99) - (catOrder.get(b.category_id) ?? 99) || a.sort_order - b.sort_order,
      ),
    );
    this.loading.set(false);
  }

  protected categoryName(id: string) {
    return this.categories().find((c) => c.id === id)?.name ?? 'Sin categoría';
  }

  protected patch<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected openCreate() {
    this.editingId.set(null);
    const cat = this.filterCat() !== 'all' ? this.filterCat() : (this.categories()[0]?.id ?? '');
    this.form.set({ ...EMPTY, category_id: cat });
    this.formError.set(null);
    this.modalOpen.set(true);
  }

  protected openEdit(p: Product) {
    this.editingId.set(p.id);
    this.form.set({
      name: p.name,
      description: p.description ?? '',
      price: Number(p.price),
      category_id: p.category_id,
      image_url: p.image_url ?? '',
      is_available: p.is_available,
    });
    this.formError.set(null);
    this.modalOpen.set(true);
  }

  protected closeModal() {
    if (!this.saving()) this.modalOpen.set(false);
  }

  protected async save(e: Event) {
    e.preventDefault();
    const f = this.form();
    if (!f.name.trim()) return this.formError.set('El nombre es obligatorio.');
    if (!f.category_id) return this.formError.set('Elegí una categoría.');
    if (f.price === null || f.price < 0) return this.formError.set('Ingresá un precio válido.');

    const payload = {
      name: f.name.trim(),
      description: f.description.trim() || null,
      price: f.price,
      category_id: f.category_id,
      image_url: f.image_url.trim() || null,
      is_available: f.is_available,
    };
    this.saving.set(true);
    const id = this.editingId();
    const { error } = id
      ? await supabase.from('products').update(payload).eq('id', id)
      : await supabase.from('products').insert({
          ...payload,
          restaurant_id: this.rid,
          sort_order:
            Math.max(0, ...this.products().filter((p) => p.category_id === f.category_id).map((p) => p.sort_order)) + 1,
        });
    this.saving.set(false);
    if (error) return this.formError.set(errorMessage(error));
    this.modalOpen.set(false);
    await this.load();
  }

  protected async toggleAvailable(p: Product) {
    this.products.update((list) => list.map((x) => (x.id === p.id ? { ...x, is_available: !x.is_available } : x)));
    const { error } = await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id);
    if (error) {
      this.error.set(errorMessage(error));
      await this.load();
    }
  }

  protected async remove(p: Product) {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    const { error } = await supabase.from('products').delete().eq('id', p.id);
    if (error) {
      this.error.set(
        error.code === '23503'
          ? `"${p.name}" ya figura en pedidos, así que no se puede eliminar. Desactivalo para ocultarlo del menú.`
          : errorMessage(error),
      );
      return;
    }
    await this.load();
  }
}
