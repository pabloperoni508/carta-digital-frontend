import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/**
 * Cliente único de Supabase para toda la app.
 * - Cliente de mesa: usa la anon key sin iniciar sesión (rol `anon`).
 * - Staff (admin / cocina / superadmin): misma instancia, logueado con Supabase Auth.
 */
export const supabase: SupabaseClient = createClient(
  environment.SUPABASE_URL,
  environment.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Evita el NavigatorLock del navegador, que en apps Angular puede
      // quedar colgado ("NavigatorLockAcquireTimeoutError").
      lock: async (_name, _timeout, fn) => fn(),
    },
  },
);

export function isSupabaseConfigured(): boolean {
  return (
    !environment.SUPABASE_URL.includes('TU-PROYECTO') &&
    environment.SUPABASE_ANON_KEY !== 'tu-anon-key'
  );
}
