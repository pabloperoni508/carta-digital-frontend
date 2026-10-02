import { Component, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { supabase } from '../../core/supabase';
import { DiningTable, NfcTag } from '../../core/models';
import { errorMessage } from '../../core/format';
import { Alert, Icon, SectionHeader, Spinner } from '../../shared/ui';

@Component({
  selector: 'app-admin-tables',
  imports: [SectionHeader, Icon, Alert, Spinner],
  template: `
    <div class="max-w-3xl">
      <app-section-header title="Mesas / NFC" subtitle="Asociá los tags NFC (o QR) a las mesas" class="mb-6" />
      @if (error()) { <app-alert class="mb-4" [dismissible]="true" (dismissed)="error.set(null)">{{ error() }}</app-alert> }
      @if (notice()) { <app-alert tone="ok" class="mb-4" [dismissible]="true" (dismissed)="notice.set(null)">{{ notice() }}</app-alert> }

      @if (loading()) {
        <app-spinner />
      } @else {
        <div class="bg-warm-surface rounded-2xl border border-warm-border overflow-hidden mb-4">
          <div class="hidden sm:grid grid-cols-[1fr_1.4fr_0.7fr_1.6fr] gap-3 px-4 py-2.5 border-b border-warm-border">
            <span class="text-warm-muted text-xs uppercase tracking-wider">Mesa</span>
            <span class="text-warm-muted text-xs uppercase tracking-wider">Tag NFC</span>
            <span class="text-warm-muted text-xs uppercase tracking-wider">Estado</span>
            <span class="text-warm-muted text-xs uppercase tracking-wider text-right">Acciones</span>
          </div>
          @for (row of rows(); track row.table.id) {
            <div class="grid grid-cols-2 sm:grid-cols-[1fr_1.4fr_0.7fr_1.6fr] gap-3 px-4 py-3 border-b border-warm-border last:border-0 items-center">
              <span class="text-warm-fg text-sm font-medium">{{ row.table.label }}</span>

              @if (editingId() === row.table.id) {
                <input type="text" class="!text-xs !py-1 !px-2 font-mono" [value]="editUid()" placeholder="bar-lindo-mesa-6"
                  (input)="editUid.set($any($event.target).value)" (keydown.enter)="saveUid(row.table, row.tag)"
                  (keydown.escape)="editingId.set(null)" autofocus />
              } @else {
                <span class="font-mono text-sm truncate" [class]="row.tag ? 'text-warm-fg' : 'text-warm-muted'">
                  {{ row.tag?.tag_uid ?? 'Sin tag' }}
                  @if (row.tag && !row.tag.is_active) { <span class="text-status-pending text-xs">(desactivado)</span> }
                </span>
              }

              <span class="text-xs font-medium" [class]="row.table.is_active ? 'text-status-done' : 'text-warm-muted'">
                {{ row.table.is_active ? 'Activa' : 'Inactiva' }}
              </span>

              <div class="flex gap-3 justify-end items-center flex-wrap">
                @if (editingId() === row.table.id) {
                  <button type="button" (click)="saveUid(row.table, row.tag)" class="text-amber text-xs hover:text-amber-light">OK</button>
                  <button type="button" (click)="editingId.set(null)" class="text-warm-muted text-xs hover:text-warm-fg">Cancelar</button>
                } @else {
                  @if (row.tag) {
                    <button type="button" (click)="copyLink(row.tag)" class="text-warm-muted text-xs hover:text-warm-fg flex items-center gap-1" title="Copiar el link para grabar en el NFC/QR">
                      <app-icon name="link" class="w-3.5 h-3.5" /> Link
                    </button>
                  }
                  <button type="button" (click)="startEdit(row.table.id, row.tag)" class="text-warm-muted text-xs hover:text-warm-fg">
                    {{ row.tag ? 'Editar NFC' : 'Asignar NFC' }}
                  </button>
                  <button type="button" (click)="toggleTable(row.table)" class="text-xs hover:opacity-80"
                    [class]="row.table.is_active ? 'text-status-pending' : 'text-status-done'">
                    {{ row.table.is_active ? 'Desactivar' : 'Activar' }}
                  </button>
                }
              </div>
            </div>
          } @empty {
            <p class="px-4 py-6 text-warm-muted text-sm">Todavía no hay mesas.</p>
          }
        </div>

        @if (unassigned().length) {
          <div class="bg-warm-surface rounded-2xl border border-status-process/30 p-4 mb-4">
            <p class="text-status-process text-xs uppercase tracking-wider mb-3">Tags sin mesa</p>
            @for (tag of unassigned(); track tag.id) {
              <div class="flex items-center gap-3 py-1.5">
                <span class="font-mono text-sm flex-1 truncate">{{ tag.tag_uid }}</span>
                <select class="!w-auto !py-1 !px-2 text-xs" (change)="reassign(tag, $any($event.target).value)">
                  <option value="">Asignar a...</option>
                  @for (t of tables(); track t.id) { <option [value]="t.id">{{ t.label }}</option> }
                </select>
              </div>
            }
          </div>
        }

        @if (adding()) {
          <div class="bg-warm-surface rounded-xl border border-warm-border p-4 flex flex-col sm:flex-row gap-3">
            <input type="text" placeholder="Nombre (ej: Mesa 6)" [value]="newLabel()" (input)="newLabel.set($any($event.target).value)" class="sm:!flex-1" />
            <input type="text" placeholder="Código NFC (opcional)" [value]="newUid()" (input)="newUid.set($any($event.target).value)" class="sm:!flex-1 font-mono" />
            <button type="button" (click)="addTable()" class="px-4 py-2 bg-amber text-amber-fg rounded-xl text-sm font-semibold hover:bg-amber-light whitespace-nowrap">Agregar</button>
            <button type="button" (click)="adding.set(false)" class="px-3 py-2 text-warm-muted hover:text-warm-fg text-sm" aria-label="Cancelar">×</button>
          </div>
        } @else {
          <button type="button" (click)="adding.set(true)" class="flex items-center gap-2 text-amber text-sm font-medium hover:text-amber-light transition-colors">
            <app-icon name="plus" class="w-4 h-4" /> Agregar mesa
          </button>
        }

        <p class="text-warm-muted text-xs mt-8 leading-relaxed">
          Cada tag NFC (o QR) debe abrir <span class="font-mono text-warm-fg">{{ origin }}/m/&lt;código&gt;</span>.
          Si cambiás un tag de mesa, no hace falta reprogramar el chip.
        </p>
      }
    </div>`,
})
export class AdminTables {
  private auth = inject(AuthService);
  protected readonly origin = location.origin;
  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected notice = signal<string | null>(null);
  protected tables = signal<DiningTable[]>([]);
  protected tags = signal<NfcTag[]>([]);
  protected editingId = signal<string | null>(null);
  protected editUid = signal('');
  protected adding = signal(false);
  protected newLabel = signal('');
  protected newUid = signal('');

  protected rows = computed(() =>
    this.tables().map((table) => ({ table, tag: this.tags().find((t) => t.table_id === table.id) ?? null })),
  );
  protected unassigned = computed(() => this.tags().filter((t) => !t.table_id));

  constructor() {
    effect(() => {
      if (this.auth.activeRestaurantId()) this.load();
    });
  }

  private get rid() {
    return this.auth.activeRestaurantId()!;
  }

  private async load() {
    const [t, g] = await Promise.all([
      supabase.from('tables').select('*').eq('restaurant_id', this.rid),
      supabase.from('nfc_tags').select('*').eq('restaurant_id', this.rid),
    ]);
    if (t.error || g.error) this.error.set(errorMessage(t.error ?? g.error));
    this.tables.set(((t.data ?? []) as DiningTable[]).sort((a, b) => a.label.localeCompare(b.label, 'es', { numeric: true })));
    this.tags.set((g.data ?? []) as NfcTag[]);
    this.loading.set(false);
  }

  protected startEdit(tableId: string, tag: NfcTag | null) {
    this.editingId.set(tableId);
    this.editUid.set(tag?.tag_uid ?? '');
  }

  protected async saveUid(table: DiningTable, tag: NfcTag | null) {
    const uid = this.editUid().trim();
    this.editingId.set(null);
    if (!uid || uid === tag?.tag_uid) return;
    const { error } = tag
      ? await supabase.from('nfc_tags').update({ tag_uid: uid }).eq('id', tag.id)
      : await supabase.from('nfc_tags').insert({ tag_uid: uid, restaurant_id: this.rid, table_id: table.id });
    if (error) this.error.set(errorMessage(error));
    await this.load();
  }

  protected async toggleTable(table: DiningTable) {
    const { error } = await supabase.from('tables').update({ is_active: !table.is_active }).eq('id', table.id);
    if (error) this.error.set(errorMessage(error));
    await this.load();
  }

  protected async reassign(tag: NfcTag, tableId: string) {
    if (!tableId) return;
    const { error } = await supabase.rpc('reassign_nfc_tag', { p_tag_id: tag.id, p_table_id: tableId });
    if (error) this.error.set(errorMessage(error));
    await this.load();
  }

  protected async addTable() {
    const label = this.newLabel().trim();
    const uid = this.newUid().trim();
    if (!label) return;
    const { data, error } = await supabase
      .from('tables')
      .insert({ restaurant_id: this.rid, label })
      .select()
      .single();
    if (error) return this.error.set(errorMessage(error));
    if (uid) {
      const r = await supabase.from('nfc_tags').insert({ tag_uid: uid, restaurant_id: this.rid, table_id: data.id });
      if (r.error) this.error.set(errorMessage(r.error));
    }
    this.newLabel.set('');
    this.newUid.set('');
    this.adding.set(false);
    await this.load();
  }

  protected async copyLink(tag: NfcTag) {
    const url = `${this.origin}/m/${encodeURIComponent(tag.tag_uid)}`;
    try {
      await navigator.clipboard.writeText(url);
      this.notice.set(`Link copiado: ${url}`);
    } catch {
      this.notice.set(url);
    }
  }
}
