# Miga

Miga es un recetario para emprendimientos gastronómicos. Permite registrar los insumos, calcular su costo proporcional según el packaging y definir un precio de venta sugerido para cada receta.

## Inicio rápido

```bash
pnpm install
pnpm dev
```

La aplicación queda disponible en `http://localhost:5173`. Necesita un proyecto de Supabase y estas variables en un `.env.local` (la guía completa está en [docs/supabase.md](docs/supabase.md)):

```
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## Comandos

| Comando        | Uso                              |
| -------------- | -------------------------------- |
| `pnpm install` | Instala las dependencias         |
| `pnpm dev`     | Inicia el servidor de desarrollo |
| `pnpm build`   | Genera el build de producción    |
| `pnpm preview` | Previsualiza el build generado   |
| `pnpm test`    | Corre los tests (Vitest)         |

## Funcionalidades

- Ver en el inicio cómo va el negocio en el mes: ventas (lo cobrado de los pedidos entregados), ganancia real y margen, cantidad de pedidos y saldo por cobrar, comparados con el mes anterior. También las entregas de los próximos 7 días, lo que falta comprar, los elaborados con más de 3 días y las recetas más vendidas y más rentables.
- Registrar, editar y eliminar insumos.
- Definir categoría (Secos, Lácteos, Frescos, Chocolates, Decoración u Otros), unidad base, presentación de compra, su costo y cuánto tenés ("Tengo").
- Llevar el listado de packaging (bolsas, cajas) con su presentación de compra, costo, costo por unidad y cuántas unidades tenés. El packaging va por pedido, no en la receta.
- Cargar los pedidos: cliente y contacto, fecha y hora de entrega, si retira o hay envío, productos (receta × unidades), packaging, notas, precio acordado y lo cobrado.
- Personalizar un pedido con temática (Halloween, Día de la madre…): insumos de decoración, que suman su costo y descuentan stock al prepararlo, y un recargo por diseño en % de los productos o como monto fijo. El precio propuesto ya los incluye.
- Seguir cada pedido por estado (Pendiente, Confirmado, En preparación, Listo, Entregado o Cancelado) y por pago (Sin pagar, Señado o Pagado, según lo cobrado).
- Ver el precio propuesto desde el precio de venta, el sugerido de referencia y la ganancia real del precio acordado.
- Ver los pedidos agrupados por fecha de entrega (Atrasados, Hoy, Mañana, Esta semana, Más adelante), filtrarlos por estado, buscarlos por cliente y cambiarles el estado desde la lista.
- Descontar el stock al preparar un pedido: usa primero los elaborados más viejos, cocina tandas completas para el resto y guarda lo que sobra como elaborado. Nunca queda en negativo: si no alcanza, avisa qué falta y deja actualizar el stock ahí mismo.
- Devolver el stock si el pedido vuelve atrás, y dejar lo cocinado como elaborado si se cancela.
- Ver los elaborados de cada receta con su antigüedad, cargarlos a mano, corregirlos o descartarlos.
- Ver la lista de compras de los pedidos pendientes y confirmados, agrupada por góndola, con lo que necesitás, lo que tenés y lo que te falta.
- Crear recetas con categoría, rendimiento, ganancia sobre el costo, precio de venta, gastos extra e ingredientes utilizados.
- Ver la biblioteca de recetas agrupada por categoría, con secciones plegables y filtro. Las categorías se crean desde la receta y se renombran o eliminan en Configuración.
- Calcular lo que cuesta la tanda y cada unidad, el precio sugerido, la ganancia por unidad y avisar si el precio de venta quedó por debajo del sugerido.
- Entrar con Google y ver los mismos datos en todos los dispositivos (Supabase, con reglas de acceso por negocio y preparado para varios miembros).
- Subir a mano, una sola vez, los datos que una versión anterior guardaba en el navegador.
- Agregar la foto de cada receta como link (por ejemplo, de Cloudinary).
- Exportar e importar un backup en JSON.
- Usar la interfaz desde desktop o mobile.

## Stack

| Tecnología   | Propósito                          |
| ------------ | ---------------------------------- |
| React 18     | Interfaz de usuario                |
| Vite 8       | Desarrollo y build                 |
| Zustand      | Estado global en memoria           |
| Supabase     | Login con Google y base de datos   |
| React Router | Rutas por vista y por receta       |
| Lucide React | Iconografía                        |
| CSS          | Sistema visual responsive          |
| pnpm         | Gestor de paquetes                 |

## Estructura

```text
src/
├── app/                    # Layout (sidebar, topbar, footer, toasts) y navegación
│   └── session/            # Login y carga del negocio (AuthGate)
├── stores/                 # Stores de Zustand (datos del negocio y estado de UI)
├── lib/                    # Helpers puros (formato, fechas, costos, migraciones)
│   └── data/               # Puerto de datos, Supabase, sincronización con la nube
├── shared/                 # Componentes reutilizables entre vistas
├── features/               # Una carpeta por vista: contenedor (*Page) + vistas
│   ├── overview/
│   ├── orders/
│   ├── shopping/
│   ├── ingredients/
│   ├── packaging/
│   ├── finished/
│   ├── recipes/
│   └── settings/
├── test/                   # Setup y helpers de los tests de interfaz
├── App.jsx                 # Rutas de la aplicación
├── App.css                 # Estilos de la aplicación
├── index.css               # Estilos base y tipografías
└── main.jsx                # Punto de entrada (router, ErrorBoundary y login)
supabase/migrations/        # Esquema de la base (tablas, reglas de acceso, funciones)
docs/                       # Guías (configuración de Supabase)
```

## Rutas

| Ruta                 | Vista                                    |
| -------------------- | ---------------------------------------- |
| `/`                  | Resumen (tablero del negocio)            |
| `/pedidos`           | Pedidos                                  |
| `/compras`           | Lista de compras                         |
| `/insumos`           | Insumos                                  |
| `/packaging`         | Packaging                                |
| `/elaborados`        | Elaborados                               |
| `/recetas`           | Abre la última receta vista (o la primera) |
| `/recetas/:recipeId` | Una receta                               |
| `/configuracion`     | Backup, categorías y primera carga       |

Cualquier otra ruta redirige a `/`.

## Hosting

La app usa `BrowserRouter`, así que el hosting tiene que tener un fallback de SPA: toda ruta que no sea un archivo existente debe responder con `index.html` (por ejemplo, un rewrite `/* → /index.html`). Sin eso, recargar o abrir un link como `/recetas/cookies` devuelve 404. En Vercel ese rewrite está en `vercel.json`.

El favicon, los íconos para "Agregar a inicio" y el manifest están en `public/`. Los colores de la app son variables CSS definidas en `:root` de `src/App.css`.

## Datos

Los datos viven en Supabase, por negocio: al entrar se cargan, cada cambio se guarda solo y al volver a la pestaña se recargan. Si un guardado falla, el encabezado lo avisa y la app reintenta. El detalle está en [docs/supabase.md](docs/supabase.md).

## Licencia

Este proyecto está disponible bajo la licencia [MIT](LICENSE).
