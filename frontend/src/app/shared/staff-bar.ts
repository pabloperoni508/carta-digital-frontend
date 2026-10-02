import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Icon } from './ui';

/** Barra superior del staff (equivalente al selector "Vista" del diseño). */
@Component({
  selector: 'app-staff-bar',
  imports: [RouterLink, RouterLinkActive, Icon],
  host: { class: 'block shrink-0' },
  template: `
    <div class="flex items-center gap-1 px-3 py-2 bg-warm-surface border-b border-warm-border overflow-x-auto no-scrollbar">
      <span class="text-warm-muted text-[10px] uppercase tracking-widest mr-2 shrink-0">Vista</span>
      @for (v of views(); track v.path) {
        <a [routerLink]="v.path" routerLinkActive="!bg-amber !text-amber-fg font-semibold" #rla="routerLinkActive"
          class="shrink-0 flex flex-col items-center px-4 py-1.5 rounded-lg transition-all text-xs text-warm-muted hover:text-warm-fg">
          <span>{{ v.label }}</span>
          <span class="text-[9px] leading-none mt-0.5" [class]="rla.isActive ? 'text-amber-fg/70' : 'text-warm-muted/60'">{{ v.sublabel }}</span>
        </a>
      }
      <div class="ml-auto flex items-center gap-3 pl-3 shrink-0">
        <span class="text-warm-muted text-xs hidden sm:block truncate max-w-48">{{ auth.profile()?.email }}</span>
        <button type="button" (click)="logout()" class="text-warm-muted hover:text-warm-fg p-1" title="Cerrar sesión" aria-label="Cerrar sesión">
          <app-icon name="logout" class="w-4 h-4" />
        </button>
      </div>
    </div>`,
})
export class StaffBar {
  protected auth = inject(AuthService);
  private router = inject(Router);

  protected views = computed(() => {
    const v: { path: string; label: string; sublabel: string }[] = [];
    const role = this.auth.activeRole();
    if (role) v.push({ path: '/cocina', label: 'Cocina', sublabel: 'Kanban' });
    if (role === 'admin') v.push({ path: '/admin', label: 'Admin', sublabel: 'Panel' });
    if (this.auth.isSuperadmin()) v.push({ path: '/superadmin', label: 'Superadmin', sublabel: 'Plataforma' });
    return v;
  });

  async logout() {
    await this.auth.signOut();
    this.router.navigateByUrl('/login');
  }
}
