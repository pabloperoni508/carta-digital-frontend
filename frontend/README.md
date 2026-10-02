# Frontend — Carta Digital (Angular)

App web (Angular 21 standalone + signals + Tailwind v4) que consume el backend de
Supabase de la Parte 1. Diseño basado en el Figma Make "Restaurante/bar app"
(paleta cálida oscura, tipografías Fraunces + Outfit).

## Puesta en marcha

```bash
cd frontend
npm install
```

Completar `src/environments/environment.ts` con los datos de
**Supabase > Project Settings > API**:

```ts
export const environment = {
  SUPABASE_URL: 'https://<ref>.supabase.co',
  SUPABASE_ANON_KEY: '<anon key>',   // pública, respeta RLS. Nunca la service_role.
};
```

```bash
npm start          # http://localhost:4200
npm run build      # build de producción en dist/frontend
```

Requiere Node 20.19+ / 22.12+ / 24+.

## Deploy en Vercel

1. En `src/environments/environment.ts`, reemplazar los valores de ejemplo por el Project URL y la anon/publishable key de Supabase. Esos valores son públicos en una app cliente; nunca usar la `service_role` key.
2. Importar el repositorio en Vercel con `frontend` como **Root Directory**. El build usa `npm run build`, la salida `dist/frontend/browser` y el rewrite de `vercel.json` mantiene operativas rutas como `/m/<tag>` y `/admin` al recargar.
3. En Supabase > Authentication > URL Configuration, configurar el dominio de Vercel como **Site URL** y agregarlo a **Redirect URLs** si se habilitan flujos de autenticación con redirección.

También se puede publicar desde la carpeta `frontend` con la CLI de Vercel (`vercel` y luego `vercel --prod`).

## Pantallas y rutas

| Ruta | Quién | Qué hace | Backend |
|---|---|---|---|
| `/` | Público | Ingresar un código de mesa a mano + acceso staff | — |
| `/m/:tag` | Cliente (anon) | Menú de la mesa, carrito (bottom sheet), confirmar pedido | `resolve_nfc_tag`, `categories`, `products`, `create_order` |
| `/login` | Staff | Login con Supabase Auth; redirige según el rol | `auth`, `users`, `restaurant_users` |
| `/cocina` | kitchen, admin | Kanban Pendientes / En proceso / Terminados, drag & drop, **tiempo real** y aviso sonoro | `orders` + `order_items` (Realtime), `set_order_status` |
| `/admin` | admin | Dashboard: recaudación semanal, gráfico 11 semanas, estado de mesas | `orders`, `products`, `tables` |
| `/admin/categorias` | admin | Alta/edición/baja, orden y visibilidad | `categories` |
| `/admin/productos` | admin | ABM con modal, activar/desactivar, filtro por categoría | `products` |
| `/admin/mesas` | admin | Mesas, tags NFC, link para grabar en el chip, reasignar tags | `tables`, `nfc_tags`, `reassign_nfc_tag` |
| `/superadmin` | superadmin | Comercios: activar/desactivar, toggle "Pedidos desde la mesa", abrir el panel de cualquier comercio | `restaurants` |

### NFC / QR

Cada tag se programa con la URL **`https://<tu-dominio>/m/<tag_uid>`**
(ej. `/m/bar-lindo-mesa-1`). En **Admin > Mesas / NFC** el botón "Link" copia esa
URL. Si se mueve un tag a otra mesa no hace falta reprogramar el chip.

La sesión de mesa se guarda en `localStorage` y se reutiliza mientras no venza
(`session_ttl_minutes` del restaurante), así recargar la página no abre sesiones nuevas.

### Probar con el seed "Bar Lindo"

- Cliente: `http://localhost:4200/m/bar-lindo-mesa-1` … `mesa-5`
- Staff: `admin@barlindo.test`, `cocina@barlindo.test`, `superadmin@barlindo.test`

## Estructura

```
src/app/
├── core/
│   ├── supabase.ts              # cliente único
│   ├── models.ts                # interfaces 1:1 con el esquema
│   ├── auth.service.ts          # sesión, perfil, rol, restaurante activo
│   ├── guards.ts                # roleGuard / loginGuard
│   ├── table-session.service.ts # resolve_nfc_tag + create_order
│   └── format.ts                # precios, horas y mensajes de error P0xxx
├── shared/                      # íconos, toggle, alertas, barra del staff
└── features/
    ├── landing/  client/  auth/
    ├── kitchen/                 # kanban realtime
    ├── admin/                   # shell + dashboard, categorías, productos, mesas, gráfico SVG
    └── superadmin/
```

Tema (colores `warm-*`, `amber`, `status-*` y fuentes) en `src/styles.css` (`@theme`).
Las fuentes se sirven desde el propio bundle (`@fontsource-variable`), sin Google Fonts.

## Notas para el backend (posibles mejoras)

- **Número de pedido**: `orders` no tiene un número legible; la cocina muestra los
  últimos 4 caracteres del uuid (`#A1B2`). Una columna `order_number` por restaurante
  lo haría más claro.
- **"Más vendido"**: el diseño tiene ese badge pero `products` no tiene el campo; quedó afuera.
- **Estado del pedido para el cliente**: el cliente (anon) no puede leer `orders`, así que
  solo ve la confirmación de envío. Una RPC `get_session_orders(p_session_token)` permitiría
  mostrarle "pendiente / en proceso / listo".
