import { Component, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { supabase } from '../../core/supabase';
import { Category } from '../../core/models';
import { errorMessage } from '../../core/format';
import { Alert, Icon, SectionHeader, Spinner, Toggle } from '../../shared/ui';

@Component({
  selector: 'app-admin-categories',
  imports: [SectionHeader, Icon, Alert, Spinner, Toggle],
  template: `
    <div class="max-w-lg">
      <app-section-header title="Categorías" subtitle="Organizá las secciones del menú" class="mb-6" />
      @if (error()) { <app-alert class="mb-4" [dismissible]="true" (dismissed)="error.set(null)">{{ error() }}</app-alert> }

      @if (loading()) {
        <app-spinner />
      } @else {
        <div class="space-y-2 mb-4">
          @for (cat of categories(); track cat.id; let i = $index, last = $last, first = $first) {
            <div class="flex items-center gap-3 bg-warm-surface rounded-xl px-4 py-3 border border-warm-border" [class.opacity-60]="!cat.is_active">
              <div class="flex flex-col -my-1">
                <button type="button" (click)="move(i, -1)" [disabled]="first" class="text-warm-muted hover:text-warm-fg disabled:opacity-20 leading-none" aria-label="Subir">▲</button>
                <button type="button" (click)="move(i, 1)" [disabled]="last" class="text-warm-muted hover:text-warm-fg disabled:opacity-20 leading-none" aria-label="Bajar">▼</button>
              </div>
              @if (editingId() === cat.id) {
                <input type="text" [value]="editName()" (input)="editName.set($any($event.target).value)"
                  (keydown.enter)="saveEdit()" (keydown.escape)="editingId.set(null)"
                  class="!flex-1 !py-0 !px-0 !border-0 !border-b !border-amber !bg-transparent !rounded-none text-sm" autofocus />
                <button type="button" (click)="saveEdit()" class="text-amber text-xs font-medium hover:text-amber-light">Guardar</button>
              } @else {
                <span class="flex-1 text-warm-fg text-sm">{{ cat.name }}</span>
                <app-toggle [on]="cat.is_active" (toggled)="toggleActive(cat)" [label]="cat.is_active ? 'Ocultar del menú' : 'Mostrar en el menú'" />
                <div class="flex gap-2">
                  <button type="button" (click)="startEdit(cat)" class="text-warm-muted text-xs hover:text-warm-fg">Editar</button>
                  <button type="button" (click)="remove(cat)" class="text-status-pending text-xs hover:opacity-80">Eliminar</button>
                </div>
              }
            </div>
          } @empty {
            <p class="text-warm-muted text-sm">Todavía no hay categorías.</p>
          }
        </div>

        @if (adding()) {
          <div class="flex gap-2">
            <input type="text" placeholder="Nombre de la categoría" [value]="newName()"
              (input)="newName.set($any($event.target).value)" (keydown.enter)="add()" autofocus />
            <button type="button" (click)="add()" class="px-4 py-2 bg-amber text-amber-fg rounded-xl text-sm font-semibold whitespace-nowrap hover:bg-amber-light">Crear</button>
            <button type="button" (click)="adding.set(false)" class="px-3 py-2 text-warm-muted hover:text-warm-fg text-sm" aria-label="Cancelar">×</button>
          </div>
        } @else {
          <button type="button" (click)="adding.set(true)" class="flex items-center gap-2 text-amber text-sm font-medium hover:text-amber-light transition-colors">
            <app-icon name="plus" class="w-4 h-4" /> Nueva categoría
          </button>
        }
      }
    </div>`,
})
export class AdminCategories {
  private auth = inject(AuthService);
  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected categories = signal<Category[]>([]);
  protected editingId = signal<string | null>(null);
  protected editName = signal('');
  protected adding = signal(false);
  protected newName = signal('');

  constructor() {
    effect(() => {
      if (this.auth.activeRestaurantId()) this.load();
    });
  }

  private get rid() {
    return this.auth.activeRestaurantId()!;
  }

  private async load() {
    const { data, error } = await supabase.from('categories').select('*').eq('restaurant_id', this.rid).order('sort_order');
    if (error) this.error.set(errorMessage(error));
    this.categories.set((data ?? []) as Category[]);
    this.loading.set(false);
  }

  protected startEdit(cat: Category) {
    this.editingId.set(cat.id);
    this.editName.set(cat.name);
  }

  protected async saveEdit() {
    const id = this.editingId();
    const name = this.editName().trim();
    this.editingId.set(null);
    if (!id || !name) return;
    const { error } = await supabase.from('categories').update({ name }).eq('id', id);
    if (error) this.error.set(errorMessage(error));
    await this.load();
  }

  protected async add() {
    const name = this.newName().trim();
    if (!name) return;
    const sort_order = Math.max(0, ...this.categories().map((c) => c.sort_order)) + 1;
    const { error } = await supabase.from('categories').insert({ restaurant_id: this.rid, name, sort_order });
    if (error) return this.error.set(errorMessage(error));
    this.newName.set('');
    this.adding.set(false);
    await this.load();
  }

  protected async toggleActive(cat: Category) {
    const { error } = await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    if (error) this.error.set(errorMessage(error));
    await this.load();
  }

  protected async remove(cat: Category) {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
    if (error) {
      this.error.set(
        error.code === '23503'
          ? 'La categoría tiene productos. Movelos a otra categoría o desactivala en lugar de eliminarla.'
          : errorMessage(error),
      );
      return;
    }
    await this.load();
  }

  /** Intercambia sort_order con la categoría vecina. */
  protected async move(index: number, delta: number) {
    const list = this.categories();
    const a = list[index];
    const b = list[index + delta];
    if (!a || !b) return;
    const next = [...list];
    next[index] = b;
    next[index + delta] = a;
    this.categories.set(next);
    const orderA = a.sort_order === b.sort_order ? b.sort_order + delta : b.sort_order;
    const [r1, r2] = await Promise.all([
      supabase.from('categories').update({ sort_order: orderA }).eq('id', a.id),
      supabase.from('categories').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    if (r1.error || r2.error) this.error.set(errorMessage(r1.error ?? r2.error));
    await this.load();
  }
}
