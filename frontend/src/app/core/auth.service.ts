import { Injectable, computed, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { RestaurantMembership, UserProfile } from './models';

const ACTIVE_RESTAURANT_KEY = 'cd.activeRestaurantId';

/**
 * Estado de autenticación del staff (superadmin / admin / cocina).
 * El rol real se resuelve en el backend: `users.is_superadmin` y `restaurant_users.role`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<Session | null>(null);
  readonly profile = signal<UserProfile | null>(null);
  readonly memberships = signal<RestaurantMembership[]>([]);
  /** Restaurante sobre el que trabaja el panel (el superadmin puede elegirlo). */
  readonly activeRestaurantId = signal<string | null>(null);

  readonly isLoggedIn = computed(() => !!this.session());
  readonly isSuperadmin = computed(() => !!this.profile()?.is_superadmin);

  readonly activeMembership = computed(() =>
    this.memberships().find((m) => m.restaurant_id === this.activeRestaurantId()) ?? null,
  );

  /** Rol en el restaurante activo. El superadmin actúa como admin. */
  readonly activeRole = computed<'admin' | 'kitchen' | null>(() => {
    if (this.isSuperadmin() && this.activeRestaurantId()) return 'admin';
    return this.activeMembership()?.role ?? null;
  });

  private initPromise: Promise<void> | null = null;

  constructor() {
    supabase.auth.onAuthStateChange((event, session) => {
      this.session.set(session);
      if (event === 'SIGNED_OUT') this.clear();
    });
  }

  /** Carga sesión + perfil una sola vez (lo usan los guards). */
  init(): Promise<void> {
    this.initPromise ??= this.load();
    return this.initPromise;
  }

  private async load(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    this.session.set(data.session);
    if (data.session) await this.loadProfile(data.session.user.id);
  }

  private async loadProfile(userId: string): Promise<void> {
    const [{ data: profile }, { data: memberships }] = await Promise.all([
      supabase.from('users').select('id, email, full_name, is_superadmin').eq('id', userId).maybeSingle(),
      supabase
        .from('restaurant_users')
        .select('restaurant_id, role, restaurant:restaurants(id, name, slug)')
        .eq('user_id', userId),
    ]);
    this.profile.set((profile as UserProfile) ?? null);
    const ms = (memberships ?? []) as unknown as RestaurantMembership[];
    this.memberships.set(ms);

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(ACTIVE_RESTAURANT_KEY);
    } catch {}
    const valid = stored && (this.profile()?.is_superadmin || ms.some((m) => m.restaurant_id === stored));
    this.activeRestaurantId.set(valid ? stored : (ms[0]?.restaurant_id ?? null));
  }

  async signIn(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.session.set(data.session);
    await this.loadProfile(data.user.id);
    this.initPromise = Promise.resolve();
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    this.clear();
  }

  setActiveRestaurant(id: string): void {
    this.activeRestaurantId.set(id);
    try {
      localStorage.setItem(ACTIVE_RESTAURANT_KEY, id);
    } catch {}
  }

  /** Pantalla de inicio según el rol. */
  homeRoute(): string {
    if (this.isSuperadmin()) return '/superadmin';
    if (this.activeRole() === 'admin') return '/admin';
    if (this.activeRole() === 'kitchen') return '/cocina';
    return '/login';
  }

  private clear(): void {
    this.profile.set(null);
    this.memberships.set([]);
    this.activeRestaurantId.set(null);
    this.initPromise = null;
  }
}
