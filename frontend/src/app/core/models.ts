// Interfaces alineadas 1:1 con el esquema del backend (backend/docs/schema.sql).

export type OrderStatus = 'pendiente' | 'en_proceso' | 'terminado';
export type RestaurantUserRole = 'admin' | 'kitchen';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  orders_enabled: boolean;
  session_ttl_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  is_superadmin: boolean;
}

export interface RestaurantMembership {
  restaurant_id: string;
  role: RestaurantUserRole;
  restaurant: Pick<Restaurant, 'id' | 'name' | 'slug'> | null;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
}

export interface DiningTable {
  id: string;
  restaurant_id: string;
  label: string;
  is_active: boolean;
}

export interface NfcTag {
  id: string;
  tag_uid: string;
  restaurant_id: string;
  table_id: string | null;
  is_active: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string;
  session_id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface OrderWithDetails extends Order {
  order_items: OrderItem[];
  table: { label: string } | null;
}

/** Respuesta de la RPC `resolve_nfc_tag`. */
export interface TableSession {
  session_token: string;
  expires_at: string;
  restaurant: { id: string; name: string; slug: string };
  table: { id: string; label: string };
}

/** Respuesta de la RPC `create_order`. */
export interface CreateOrderResult {
  order_id: string;
  status: OrderStatus;
  total: number;
  item_count: number;
}
