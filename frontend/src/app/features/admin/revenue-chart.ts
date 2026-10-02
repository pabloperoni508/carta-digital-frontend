import { Component, computed, input, signal } from '@angular/core';
import { formatPrice } from '../../core/format';

export interface ChartPoint {
  label: string;
  total: number;
}

/** Gráfico de área en SVG (réplica del AreaChart de Recharts del diseño, sin dependencias). */
@Component({
  selector: 'app-revenue-chart',
  host: { class: 'block relative' },
  template: `
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="w-full h-[200px] overflow-visible" preserveAspectRatio="none"
      (mousemove)="onMove($event)" (mouseleave)="hover.set(null)" role="img" aria-label="Recaudación por semana">
      <defs>
        <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c9a042" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#c9a042" stop-opacity="0" />
        </linearGradient>
      </defs>
      @for (t of ticks(); track t.v) {
        <line [attr.x1]="PL" [attr.x2]="W" [attr.y1]="t.y" [attr.y2]="t.y" stroke="#3d342a" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" />
      }
      <path [attr.d]="area()" fill="url(#amberGrad)" />
      <path [attr.d]="line()" fill="none" stroke="#c9a042" stroke-width="2" vector-effect="non-scaling-stroke" />
      @if (hover() !== null) {
        <line [attr.x1]="pts()[hover()!].x" [attr.x2]="pts()[hover()!].x" y1="0" [attr.y2]="H - PB" stroke="#3d342a" vector-effect="non-scaling-stroke" />
      }
    </svg>
    <!-- Etiquetas en HTML para que no se deformen con preserveAspectRatio -->
    @for (t of ticks(); track t.v) {
      <span class="absolute left-0 -translate-y-1/2 text-[10px] text-warm-muted" [style.top.%]="(t.y / H) * 100">{{ t.label }}</span>
    }
    <div class="absolute bottom-0 inset-x-0 h-5">
      @for (p of pts(); track $index) {
        <span class="absolute -translate-x-1/2 text-[11px] text-warm-muted whitespace-nowrap" [style.left.%]="(p.x / W) * 100">{{ data()[$index].label }}</span>
      }
    </div>
    @if (hover() !== null) {
      <span class="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber border-2 border-warm-bg pointer-events-none"
        [style.left.%]="(pts()[hover()!].x / W) * 100" [style.top.%]="(pts()[hover()!].y / H) * 100"></span>
      <div class="absolute -translate-x-1/2 -translate-y-full -mt-3 bg-warm-surface border border-warm-border rounded-xl px-3 py-2 shadow-xl pointer-events-none"
        [style.left.%]="(pts()[hover()!].x / W) * 100" [style.top.%]="(pts()[hover()!].y / H) * 100">
        <p class="text-warm-muted text-xs mb-0.5 whitespace-nowrap">{{ data()[hover()!].label }}</p>
        <p class="text-amber font-bold text-sm whitespace-nowrap">{{ fmt(data()[hover()!].total) }}</p>
      </div>
    }`,
})
export class RevenueChart {
  readonly data = input.required<ChartPoint[]>();

  protected readonly W = 600;
  protected readonly H = 200;
  protected readonly PL = 36; // espacio para eje Y
  protected readonly PB = 22; // espacio para eje X
  protected readonly fmt = formatPrice;
  protected hover = signal<number | null>(null);

  private max = computed(() => {
    const m = Math.max(0, ...this.data().map((d) => d.total));
    if (m === 0) return 1000;
    const step = Math.pow(10, Math.floor(Math.log10(m)));
    return Math.ceil(m / step) * step;
  });

  protected pts = computed(() => {
    const d = this.data();
    const innerW = this.W - this.PL - 8;
    const innerH = this.H - this.PB - 6;
    return d.map((p, i) => ({
      x: this.PL + 4 + (d.length <= 1 ? innerW / 2 : (i * innerW) / (d.length - 1)),
      y: 6 + innerH - (p.total / this.max()) * innerH,
    }));
  });

  protected ticks = computed(() => {
    const innerH = this.H - this.PB - 6;
    return [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const v = this.max() * f;
      return { v, y: 6 + innerH - f * innerH, label: v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}` };
    });
  });

  /** Curva suave (catmull-rom → bezier), similar a type="monotone". */
  protected line = computed(() => {
    const p = this.pts();
    if (!p.length) return '';
    let d = `M${p[0].x},${p[0].y}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] ?? p[i];
      const p1 = p[i];
      const p2 = p[i + 1];
      const p3 = p[i + 2] ?? p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
    }
    return d;
  });

  protected area = computed(() => {
    const p = this.pts();
    if (!p.length) return '';
    const base = this.H - this.PB;
    return `${this.line()} L${p[p.length - 1].x},${base} L${p[0].x},${base} Z`;
  });

  protected onMove(e: MouseEvent) {
    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * this.W;
    let best = 0;
    this.pts().forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(this.pts()[best].x - x)) best = i;
    });
    this.hover.set(this.pts().length ? best : null);
  }
}
