import { OrderStatus } from './models';

export function formatPrice(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return '$' + n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

export function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** "Ahora", "1 min", "12 min", "1 h 5 min". */
export function elapsedSince(iso: string, now = Date.now()): string {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h} h ${mins % 60} min`;
}

/** Número corto y legible para un pedido (el backend usa uuid). */
export function shortOrderId(id: string): string {
  return id.replace(/-/g, '').slice(-4).toUpperCase();
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  terminado: 'Terminado',
};

/**
 * Traduce los errores del backend (códigos P0xxx de las RPC y errores
 * comunes de Postgres/Auth) a mensajes para el usuario.
 */
const ERROR_MESSAGES: Record<string, string> = {
  P0001: 'La sesión de la mesa no es válida. Escaneá la mesa nuevamente.',
  P0002: 'La sesión expiró. Escaneá la mesa nuevamente.',
  P0003: 'El restaurante no está disponible en este momento.',
  P0004: 'Los pedidos desde la mesa están deshabilitados.',
  P0005: 'El pedido no tiene productos.',
  P0006: 'Hay una cantidad inválida en el pedido.',
  P0007: 'Algún producto ya no está disponible. Revisá tu pedido.',
  P0008: 'El pedido no existe.',
  P0009: 'No tenés permiso para cambiar el estado de este pedido.',
  P0101: 'El código escaneado no es válido.',
  P0102: 'Este código está desactivado.',
  P0103: 'Este código no está asignado a ninguna mesa.',
  P0104: 'El restaurante no está disponible.',
  P0105: 'No tenés permiso para reasignar este tag.',
  P0106: 'La mesa destino no pertenece a este restaurante.',
  '23503': 'No se puede eliminar: hay otros datos que dependen de este registro.',
  '23505': 'Ya existe un registro con ese valor.',
  '42501': 'No tenés permiso para realizar esta acción.',
};

export function errorMessage(err: unknown): string {
  if (!err) return 'Ocurrió un error inesperado.';
  const e = err as { code?: string; message?: string };
  if (e.code && ERROR_MESSAGES[e.code]) return ERROR_MESSAGES[e.code];
  if (e.message === 'Invalid login credentials') return 'Email o contraseña incorrectos.';
  if (e.message?.includes('Failed to fetch')) return 'No se pudo conectar con el servidor.';
  return e.message || 'Ocurrió un error inesperado.';
}
