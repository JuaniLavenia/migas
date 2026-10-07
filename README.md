# Miga

Miga es un recetario para emprendimientos gastronómicos. Permite registrar los insumos, calcular su costo proporcional según el packaging y definir un precio de venta sugerido para cada receta.

## Inicio rápido

```bash
pnpm install
pnpm dev
```

La aplicación queda disponible en `http://localhost:5173`.

## Comandos

| Comando        | Uso                              |
| -------------- | -------------------------------- |
| `pnpm install` | Instala las dependencias         |
| `pnpm dev`     | Inicia el servidor de desarrollo |
| `pnpm build`   | Genera el build de producción    |
| `pnpm preview` | Previsualiza el build generado   |
| `pnpm test`    | Corre los tests (Vitest)         |

## Funcionalidades

- Registrar, editar y eliminar insumos.
- Definir categoría, unidad base, contenido del packaging y costo de compra.
- Crear recetas con rendimiento, margen, gastos extra e ingredientes utilizados.
- Calcular costo total, costo unitario y precio sugerido.
- Persistir recetas e insumos en el navegador mediante Zustand Persist.
- Usar la interfaz desde desktop o mobile.

## Stack

| Tecnología   | Propósito                          |
| ------------ | ---------------------------------- |
| React 18     | Interfaz de usuario                |
| Vite 4       | Desarrollo y build                 |
| Zustand      | Estado global y persistencia local |
| React Router | Rutas por vista y por receta       |
| Lucide React | Iconografía                        |
| CSS          | Sistema visual responsive          |
| pnpm         | Gestor de paquetes                 |

## Estructura

```text
src/
├── app/                    # Layout (sidebar, topbar, footer, toasts) y navegación
├── stores/                 # Stores de Zustand (datos persistidos y estado de UI)
├── lib/                    # Helpers puros (formato, fechas, costos, migraciones)
├── shared/                 # Componentes reutilizables entre vistas
├── features/               # Una carpeta por vista: contenedor (*Page) + vistas
│   ├── overview/
│   ├── ingredients/
│   ├── recipes/
│   └── settings/
├── test/                   # Setup y helpers de los tests de interfaz
├── App.jsx                 # Rutas de la aplicación
├── App.css                 # Estilos de la aplicación
├── index.css               # Estilos base y tipografías
└── main.jsx                # Punto de entrada (router y ErrorBoundary)
```

## Rutas

| Ruta                 | Vista                                    |
| -------------------- | ---------------------------------------- |
| `/`                  | Resumen                                  |
| `/insumos`           | Insumos                                  |
| `/recetas`           | Abre la última receta vista (o la primera) |
| `/recetas/:recipeId` | Una receta                               |
| `/configuracion`     | Backup                                   |

Cualquier otra ruta redirige a `/`.

## Hosting

La app usa `BrowserRouter`, así que el hosting tiene que tener un fallback de SPA: toda ruta que no sea un archivo existente debe responder con `index.html` (por ejemplo, un rewrite `/* → /index.html`). Sin eso, recargar o abrir un link como `/recetas/cookies` devuelve 404.

## Datos

Los datos se guardan localmente en el navegador. No se envían a un backend. Si se borra el almacenamiento del navegador, la app vuelve a cargar los datos demo iniciales. Los datos guardados tienen versión y se migran automáticamente al actualizar la app; si el navegador no deja guardar (por ejemplo, sin espacio), el encabezado lo avisa.

## Licencia

Este proyecto está disponible bajo la licencia [MIT](LICENSE).
