import { Injectable } from '@angular/core';
import { supabase } from './supabase';
import { CreateOrderResult, TableSession } from './models';

const KEY = 'cd.tableSession';

interface StoredSession extends TableSession {
  tag_uid: string;
}

/**
 * Sesión temporal del cliente de mesa (sin cuenta).
 * Se abre con `resolve_nfc_tag` al escanear el NFC/QR y se guarda localmente
 * para no abrir una sesión nueva en cada recarga de la página.
 */
@Injectable({ providedIn: 'root' })
export class TableSessionService {
  /** Devuelve una sesión vigente para el tag, reutilizando la guardada si sirve. */
  async open(tagUid: string): Promise<TableSession> {
    const stored = this.read();
    if (stored && stored.tag_uid === tagUid && new Date(stored.expires_at).getTime() - Date.now() > 60_000) {
      return stored;
    }
    const { data, error } = await supabase.rpc('resolve_nfc_tag', { p_tag_uid: tagUid });
    if (error) throw error;
    const session = data as TableSession;
    this.write({ ...session, tag_uid: tagUid });
    return session;
  }

  async createOrder(
    token: string,
    items: { product_id: string; quantity: number }[],
  ): Promise<CreateOrderResult> {
    // El total lo calcula el servidor: solo mandamos producto + cantidad.
    const { data, error } = await supabase.rpc('create_order', {
      p_session_token: token,
      p_items: items,
    });
    if (error) throw error;
    return data as CreateOrderResult;
  }

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }

  private read(): StoredSession | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      return null;
    }
  }

  private write(s: StoredSession): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
  }
}
