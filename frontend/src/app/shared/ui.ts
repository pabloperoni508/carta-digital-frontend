import { Component, input, output } from '@angular/core';

/** Íconos de trazo (heroicons outline) usados en el diseño. */
export const ICONS = {
  clipboard:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M19 9l-7 7-7-7',
  check: 'M5 13l4 4L19 7',
  close: 'M6 18L18 6M6 6l12 12',
  plus: 'M12 4v16m8-8H4',
  menu: 'M4 6h16M4 12h16M4 18h16',
  list: 'M4 6h16M4 12h16M4 18h7',
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  box: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  table: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v2H4V6zm0 2v10m16-10v10M8 8v10m8-10v10',
  nfc: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0',
  trash:
    'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  fire: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z',
  link: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  refresh:
    'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
} as const;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  host: { class: 'inline-block shrink-0' },
  template: `<svg class="w-full h-full block" fill="none" viewBox="0 0 24 24" stroke="currentColor"
    [attr.stroke-width]="stroke()"><path stroke-linecap="round" stroke-linejoin="round" [attr.d]="path()" /></svg>`,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly stroke = input(2);
  protected path = () => ICONS[this.name()];
}

@Component({
  selector: 'app-toggle',
  template: `
    <button type="button" (click)="toggled.emit()" [disabled]="disabled()"
      [attr.aria-pressed]="on()" [attr.aria-label]="label()"
      class="relative w-11 h-6 rounded-full transition-colors disabled:opacity-50"
      [class]="on() ? 'bg-amber' : 'bg-warm-surface2 border border-warm-border'">
      <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
        [class.translate-x-5]="on()"></span>
    </button>`,
})
export class Toggle {
  readonly on = input(false);
  readonly disabled = input(false);
  readonly label = input('Alternar');
  readonly toggled = output<void>();
}

@Component({
  selector: 'app-section-header',
  template: `
    <h2 class="text-2xl font-bold text-warm-fg font-display">{{ title() }}</h2>
    <p class="text-warm-muted text-sm mt-0.5">{{ subtitle() }}</p>`,
  host: { class: 'block' },
})
export class SectionHeader {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}

/** Aviso de error/estado con el estilo del diseño. */
@Component({
  selector: 'app-alert',
  host: { class: 'block' },
  template: `
    <div class="rounded-xl border px-4 py-3 text-sm flex items-start gap-3"
      [class]="tone() === 'error'
        ? 'bg-status-pending/10 border-status-pending/30 text-status-pending'
        : tone() === 'ok'
        ? 'bg-status-done/10 border-status-done/30 text-status-done'
        : 'bg-warm-surface2 border-warm-border text-warm-muted'">
      <span class="flex-1"><ng-content /></span>
      @if (dismissible()) {
        <button type="button" (click)="dismissed.emit()" class="opacity-70 hover:opacity-100" aria-label="Cerrar">
          <app-icon name="close" class="w-4 h-4" />
        </button>
      }
    </div>`,
  imports: [Icon],
})
export class Alert {
  readonly tone = input<'error' | 'ok' | 'info'>('error');
  readonly dismissible = input(false);
  readonly dismissed = output<void>();
}

@Component({
  selector: 'app-spinner',
  host: { class: 'flex items-center justify-center py-16' },
  template: `<div class="w-8 h-8 rounded-full border-2 border-warm-border border-t-amber animate-spin"></div>`,
})
export class Spinner {}
