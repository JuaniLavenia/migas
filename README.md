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
| Lucide React | Iconografía                        |
| CSS          | Sistema visual responsive          |
| pnpm         | Gestor de paquetes                 |

## Estructura

```text
src/
├── stores/
│   └── useRecipeStore.js   # Insumos y recetas con Zustand Persist
├── lib/                    # Helpers puros (formato, cálculo de costos)
├── shared/                 # Componentes reutilizables entre vistas
├── features/
│   ├── overview/
│   ├── ingredients/
│   └── recipes/
├── App.jsx                 # Shell de navegación (sidebar, topbar, routing)
├── App.css                 # Estilos de la aplicación
├── index.css               # Estilos base y tipografías
└── main.jsx                # Punto de entrada
```

## Datos

Los datos se guardan localmente en el navegador. No se envían a un backend. Si se borra el almacenamiento del navegador, la app vuelve a cargar los datos demo iniciales.

## Licencia

Este proyecto está disponible bajo la licencia [MIT](LICENSE).
