# Supabase

Miga guarda los datos en Supabase y se entra con Google. Cada fila pertenece a un **negocio** y solo sus **miembros** pueden leerla o cambiarla (row level security). La primera vez que alguien entra se crea su negocio con esa persona como dueña.

## 1. Proyecto

1. Crear un proyecto en https://supabase.com/dashboard.
2. En **SQL Editor**, pegar y correr `supabase/migrations/20261023000000_init.sql`. Crea las tablas, las reglas de acceso y las funciones `ensure_my_business` y `upload_local_data`.
3. En **Project Settings → API Keys**, copiar la **Project URL** y la **publishable key** (`sb_publishable_...`). Esa clave es pública: lo que protege los datos son las reglas del paso 2.

## 2. Login con Google

1. En https://console.cloud.google.com/auth/clients crear un cliente OAuth de tipo **Web application**:
   - **Authorized JavaScript origins:** `http://localhost:5173` y la URL de producción.
   - **Authorized redirect URIs:** la *Callback URL* de **Authentication → Sign In / Providers → Google** en Supabase (`https://<proyecto>.supabase.co/auth/v1/callback`).
2. Pegar el **Client ID** y el **Client Secret** en esa pantalla de Supabase y activar el proveedor. El secret queda solo en Supabase.
3. En **Authentication → URL Configuration**:
   - **Site URL:** la URL de producción.
   - **Redirect URLs:** `http://localhost:5173/**` y el patrón de los previews de Vercel (`https://*-<usuario>.vercel.app/**`).

## 3. Variables de entorno

En un `.env.local` en la raíz (no se sube al repo) y en Vercel → Settings → Environment Variables (Production y Preview):

```
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

La URL es solo el dominio del proyecto, sin `/rest/v1/` (la página Data API muestra la URL de la API REST). Con esa ruta, el login responde "No API key found in request".

Sin estas variables la app muestra "Falta configurar Supabase".

## Cómo se guardan los datos

- Al entrar se cargan los datos del negocio. Cada cambio se guarda solo: lo que se escribe en un campo se agrupa y se manda al dejar de escribir. Si falla (sin conexión), el encabezado muestra "No se pudo guardar" y la app reintenta.
- Al volver a la pestaña se guarda lo pendiente y se recargan los datos, así se ven los cambios hechos desde otro dispositivo.
- **Primera carga:** si el negocio está vacío y el navegador tiene datos de antes de la nube, **Configuración → Subir los datos de este dispositivo** muestra un resumen con la fecha de la última modificación y los sube todos juntos. La base rechaza la subida si el negocio ya tiene datos, así un dispositivo viejo nunca pisa datos nuevos. Las fotos guardadas en el navegador no se suben: se cargan de nuevo como link.
- Las fotos de las recetas son links (por ejemplo de Cloudinary).

## Sumar a alguien al negocio

Todavía no hay pantalla para invitar. Mientras tanto, desde el SQL Editor, con el id del negocio (`businesses`) y el del usuario (que tiene que haber entrado una vez, `auth.users`). La persona nueva tiene que salir de su negocio vacío para que la app use el compartido:

```sql
insert into public.business_members (business_id, user_id, role)
values ('<id del negocio>', '<id del usuario>', 'member');
-- Su propio negocio, creado al entrar por primera vez, sobra:
delete from public.businesses
where id in (
  select business_id from public.business_members
  where user_id = '<id del usuario>' and business_id <> '<id del negocio>'
);
```

## Tests

`src/lib/data/schema.test.js` corre la migración en un Postgres en memoria (PGlite) y comprueba las reglas de acceso, la creación del negocio y la subida inicial.
