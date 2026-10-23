# Phase 6 — Base, brand and audit

Objective: fix deep links on Vercel, add the Miga favicon/app icons, apply the business palette to the whole app through CSS tokens, and fix the audit findings.
Branch: `feat/phase-6-base-brand` from main@5337430. Delivery: single-pr (user preference). Runner: `pnpm test` (Vitest, node + jsdom projects).

## Specs

- S1 Deep links: "cuando dejo abierto la app en una pestaña por ejemplo, dentro de una receta, y luego cierro el navegador, al volver a entrar me dice que el sitio no existe". Any client route (e.g. `/recetas/:id`) served by Vercel returns the SPA, not 404. Check: `vercel.json` rewrite to `/index.html`; static assets keep being served (Vercel matches the filesystem before rewrites).
- S2 Favicon: "el icono usa el de la app Miga". Favicon = lucide `Utensils` (the `.brand-mark` icon) in cream `#f5ebe6` on a rounded `#55674C` square. Add apple-touch-icon and a web manifest so "Agregar a inicio" on the phone shows the icon. Check: files served from `public/`, referenced in `index.html`, PNGs render.
- S3 Palette: "los colores usa el de su emprendimiento: #f5ebe6, #55674C, #f9cdd5, #5c3a2e, #ffffff" — "si, aplicalo a toda la app con sus colores". Roles: background `#f5ebe6`, primary `#55674C`, accent `#f9cdd5`, text `#5c3a2e`, surfaces `#ffffff`. Every color literal in `src/App.css` / `src/index.css` becomes a `:root` custom property (no hex/rgb literal outside `:root`), near-duplicate greys collapse into a few tokens, text reaches WCAG AA (4.5:1 normal text, 3:1 UI/focus indicators). `theme-color` follows the primary. Check: grep for literals outside `:root`, computed contrast table in the Log, visual check at 390 px and desktop.
- S4 Audit fixes (accessibility): visible focus indicator on every focusable control (search field included), selected recipe exposed with `aria-current`, overview recipe rows are links, recipe editor has no skipped heading level, touch targets ≥ 40 px on mobile for icon/menu/pagination/text buttons (stacked reorder arrows 32 px, above the WCAG 2.5.8 minimum of 24 px), `prefers-reduced-motion` disables transitions, decorative thumbnails use `alt=""`, "Workspace" breadcrumb in Spanish, no dead controls (unclickable chevrons / "Mi perfil" without action). Check: RTL tests where deterministic; CSS by inspection.
- S5 Audit fixes (performance/UX): Google Fonts loaded via `<link>` + preconnect in `index.html` instead of the CSS `@import`; Insumos empty state distinguishes "no ingredients yet" (with create action) from "no search results"; "Agregar insumo" disabled state looks disabled and explains why; unused `@radix-ui/react-switch` removed. Check: RTL tests for row draft, empty state and disabled hint; build green.
- Out of scope (assumption, noted for later phases): debounced persistence and overview pagination (persistence is replaced in phase 8, overview becomes the dashboard in phase 12); route code-splitting.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T6.1 | S1 | inline | done | da63afd |
| T6.2 | S2, S5 fonts | inline | done | 162e401 |
| T6.3 | S3 | inline | done | 1a815fd |
| T6.4 | S4 | inline | done (RED 4/4 → GREEN) | 69c6530 |
| T6.5 | S5 | inline | done (RED 2/3 → GREEN; 1 regression pin) | c64a974, 0483ebe |

Route evidence: one understood change per task, no parallel independent units of several minutes each; parent writes inline. Audit map came from one read-only explorer (mapping trigger: ~1.6k-line CSS + all views).

## Log

- L1 (2026-10-23, user): "genial, esta app la esta usando mi novia para su emprendimiento de pasteleria, y me gustaria mejorarle algunas cosas: [...] - Agregarle favicon y pulir detalles que salgan con una auditoria" + "Este proyecto lo tengo subido en vercel, pero hay algo que me resulta molesto, que es cuando dejo abierto la app en una pestaña por ejemplo, dentro de una receta, y luego cierro el navegador, al volver a entrar me dice que el sitio no existe, y tengo que navegar al inicio y recargar la pagina para que me vuelva a cargar. Esto se puede solucionar?"
- L2 (2026-10-23, user): "bien, el icono usa el de la app Miga, los colores usa el de su emprendimiento: #f5ebe6, #55674C, #f9cdd5, #5c3a2e, #ffffff" / "si, aplicalo a toda la app con sus colores" / proposal approved: "perfecto, [...] Arranquemos nomas".
- L3 Diagnosis S1: `src/main.jsx:11` uses `BrowserRouter`; no `vercel.json`, so Vercel looks for a file at `/recetas/<id>` and returns 404.
- L4 Audit (explorer): ~80 distinct literal colors, 11 near-duplicate muted greys, `:root` vars bypassed; focus ring `#e8f2eb` ~1.1:1 and search `outline:0` without replacement; muted `#9aa6a0` ~2.5:1; overview rows are buttons calling `navigate()`; `key={index}` with local draft rows at `RecipesView.jsx:284` / `RecipeModal.jsx:93`; misleading Insumos empty state `IngredientsView.jsx:169`; `@radix-ui/react-switch` unused; fonts via render-blocking `@import` at `index.css:1`.
- L5 T6.2: icons rendered from SVG with @resvg/resvg-js in a scratch dir (not a project dependency): `public/favicon.svg`, `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` (maskable, icon inside the safe zone), `manifest.webmanifest`. Fonts moved from the CSS `@import` to `<link>` + preconnect. `pnpm build` copies `public/` to `dist/`.
- L6 T6.3 contrast (WCAG ratios, computed): ink #5c3a2e on white 10.00 / on bg #f5ebe6 8.53; white on primary #55674c 6.12; cream on primary 5.22; muted #7d5f54 on white 5.77 / on bg 4.92 / on surface-tint 5.04; primary on white 6.12 (focus border/outline ≥ 3:1); field border #a08579 on white 3.43; danger #a3423a on white 6.18; warning-ink #8a5a12 on warning-soft 4.97; primary-ink #4a6340 on primary-soft 5.58; accent-ink #8c3f4f on accent-soft 6.14. 0 color literals outside `:root` (grep). Visual check in Chrome (desktop): overview, recipes, ingredients.
- L7 T6.4: overview rows/shortcuts are `<Link>` (Overview drops `onNavigate`/`onSelect` props); library item `aria-current="page"`; "Insumos utilizados" h3 → h2 (`.subsection-title` keeps the look); dead "Mi perfil" avatar button and decorative chevrons removed; breadcrumb "Workspace" → "Miga"; thumbnails `alt=""` (tests now query `img[alt=""]`). Global `:focus-visible` outline, search `:focus-within` ring, mobile min 40 px targets, `prefers-reduced-motion`. Measured in a 390 px iframe: no page overflow on /insumos, /recetas/cookies, /configuracion; only controls under 40 px are the intended 32 px stacked arrows.
- L8 T6.5: the audit's index-key draft leak does not reproduce: `draftAfterValueChange` re-formats the draft whenever the committed value differs, and clicking "Eliminar" blurs (normalizes) the field first, so the item was dropped from S5. Empty Insumos now says "Todavía no cargaste insumos." with "Cargar el primer insumo"; disabled "Agregar insumo" has a visible + `aria-describedby` hint "Primero cargá insumos en la sección Insumos."; disabled buttons styled. `@radix-ui/react-switch` removed (unused, grep).
- L9 Checks: `pnpm test` 29 files / 316 tests passed; `pnpm build` ok. Note: in the user's Chrome, `/` on localhost:5173 is served by a dev service worker of another project (`dev-sw.js`, title "Visual-Detailing"); other routes load Miga's own `index.html`. Local-only, not a Miga bug.
