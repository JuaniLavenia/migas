# Phase 4 — Recipe images

## Objective
Let the user attach a photo to each recipe, stored locally in the browser without filling up localStorage, and show how much storage the images use.

## Problem / Why
- Recipes have no image; the library and overview only show the first letter of the name.
- Recipe data lives in a single localStorage key (~5 MB limit, synchronous, text only). Base64 images there would exhaust it quickly and slow every save.
- The user wants visibility of storage usage so images don't overload it.

## Decision (user-approved 2026-10-06)
- Images are stored as Blobs in IndexedDB (via `idb-keyval`), behind an `imageStore` port (`save`, `get`, `remove`, `list`/`usage`) so a future backend adapter (the paused `backend` branch) can replace it without touching the UI.
- Recipes keep only an optional `imageId` in the existing persisted store.

## Scope
- T4.1 `imageStore` port + IndexedDB adapter; image preparation helper (resize to max 1200 px on the long side, WebP ~0.8 with JPEG fallback, reject non-images and very large source files).
- T4.2 Recipe image UI: add / replace / remove in the recipe editor; thumbnails in the recipe library and the Overview; deleting a recipe removes its image; orphan cleanup (images whose id no recipe references) on startup.
- T4.3 Backup: export includes images (base64 data URLs keyed by `imageId`); import restores them; old backups without images keep working; invalid image entries are skipped and counted.
- T4.4 Storage panel in Configuración: image count and total size, total origin usage vs quota (`navigator.storage.estimate()`) as a meter, persistence status with a button that calls `navigator.storage.persist()`; warning when usage is above 80% of quota; clear message when saving an image fails for lack of space.

## Constraints
- No base64 images in localStorage.
- `imageId` is optional: no persist version bump needed unless the writer finds a shape reason; `sanitizeBackup` accepts it.
- Object URLs are revoked when no longer shown (no leaks).
- Everything must degrade gracefully when IndexedDB or `navigator.storage` is unavailable (e.g. private mode): recipes keep working, image UI explains it's unavailable.
- Accessible: image inputs labelled, images with `alt` = recipe name, meter with `role="meter"`/`<meter>` and text equivalent.
- UI copy in Spanish matching the app; code, identifiers, comments and docs in English. Commits: Conventional, neutral Spanish, no AI attribution.
- Test-first: pure logic RED→GREEN; adapter tested with `fake-indexeddb`; UI with Testing Library (canvas/WebP encoding mocked in jsdom — state the exception).

## Tasks
- [x] T4.1 `imageStore` port + IndexedDB adapter + image preparation — route: delegated
- [x] T4.2 Recipe image UI + cleanup — route: delegated
- [x] T4.3 Backup with images — route: delegated
- [x] T4.4 Storage panel + alerts — route: delegated

Route evidence: new storage adapter, image processing, store, three feature views, settings and tests → writer trigger; one bounded writer, sequential.

## Acceptance criteria
- A recipe can get, replace and lose an image; it survives reload; the library/overview show the thumbnail.
- A 4 MB phone photo is stored at roughly ≤ 300 KB.
- Deleting a recipe deletes its image; orphaned images are cleaned up.
- Export → import on a clean browser restores recipes with their images.
- Configuración shows image count/size, usage vs quota, persistence status; warns above 80%.
- With IndexedDB unavailable the app still works and says images are unavailable.
- All tests pass; build passes.

## Checks
- `corepack pnpm test`
- `corepack pnpm build`
- Manual smoke in Chrome (user's real data backed up first and restored).

## Delivery
- Branch: `feat/phase-4-recipe-images` from `main` @ 91b674f (not stacked).
- Forecast: ~700–900 authored changed lines. Strategy: `single-pr` (user's standing preference).
- RDD: off (global) — ordinary checks only.

## Progress
- Branch created.
- T4.1 (base 91b674f): port `src/lib/images/imageStore.js` (`isAvailable`, `save`, `get`, `remove`, `list`; `getImageStore`/`setImageStore` to swap adapters), errors in `imageStoreErrors.js` (`quota` | `unavailable` | `unknown`), IndexedDB adapter `idbImageStore.js` (idb-keyval, own `miga-images`/`images` store, records `{ blob, size, type }`, lazy open), in-memory adapter `memoryImageStore.js` for UI tests, shared contract test `src/test/imageStoreContract.js`. `prepareImage.js`: `fitWithin` (max 1200, no upscaling), rejects non-images and sources > 15 MB, white background, WebP 0.8 with JPEG fallback checked via `blob.type`.
  - RED: new test files failed to load (modules missing): 4 files failed, 188 existing tests passed.
  - GREEN: 15 files / 218 tests passed. Exception: node/jsdom have no image decoder or canvas, so `prepareImage` takes `decode`/`createCanvas` as dependencies and the tests use fakes; real output size is checked in the manual smoke.
  - Verification: `corepack pnpm test`: 218 passed; `corepack pnpm build`: built OK.
- T4.2 (previous commit 08c526e): recipes get an optional `imageId`; `setRecipeImage(id, imageId | null)` refreshes `updatedAt` (changing the photo is an edit). No persist version bump: the field is optional and additive, v1 data passes through `migrateRecipeState` unchanged; `sanitizeBackup` keeps a non-empty string `imageId`. `useRecipeImage` (object URL revoked on change/unmount), `RecipeThumb` (photo or the old letter/number fallback, `alt` = recipe name) in the library and the Overview list, `RecipeImageField` + `useRecipeImageEditor` (add/replace/remove with ConfirmDialog, recipe only changes after the image is stored, previous image discarded afterwards, Spanish toasts for invalid file / no space / save failure), unavailable explanation when the image store cannot be used. Deleting a recipe discards its image (best effort). Startup orphan cleanup (`lib/images/orphans.js` + `app/useOrphanImageCleanup.js`) runs once per app mount after hydration, reads the referenced ids after listing, and is skipped when localStorage cannot be read (the store would show demo data and every image would look orphaned).
  - RED: 11 failing tests (backup imageId, store setRecipeImage, 9 UI tests) + orphans test file failing to load; the migration keep-imageId test passed immediately (v1 is a pass-through; kept as a regression guard).
  - GREEN: 17 files / 234 tests passed. Exception: UI tests mock `prepareImage` (no canvas in jsdom), stub `URL.createObjectURL`, and use the in-memory image store.
  - Verification: `corepack pnpm test`: 234 passed; `corepack pnpm build`: built OK.
- T4.3 (previous commit 3124c06): `lib/images/backupImages.js` — export adds `images: { [imageId]: dataURL }` for referenced images only (missing ones left out); import validates each data URL (raster `image/*` only, SVG rejected, strict base64 with length % 4), saves it under a NEW id and remaps the recipes, so imports never collide with stored photos; recipes whose photo is invalid, missing or cannot be saved are imported without `imageId` and counted as "fotos omitidas". Old backups without `images` import unchanged. When an imported recipe replaces a stored one with a photo, the old photo is discarded. `SettingsPage` now owns export/import (async, actions disabled while busy); `SettingsView` only reads the file; `importSummary` moved to the settings feature with photo counts; `shared/downloadFile.js`.
  - RED: `backupImages.test.js` and `importSummary.test.js` failed to load (modules missing) and the 3 UI backup tests failed; 234 existing tests passed.
  - GREEN: 20 files / 260 tests passed (export → import round trip on a fresh in-memory image store, invalid photo, old backup).
  - Verification: `corepack pnpm test`: 260 passed; `corepack pnpm build`: built OK.
- T4.4 (previous commit cb4fd8e): "Almacenamiento" panel in Configuración (`StoragePanel` + `useStorageInfo`): photo count and size from the image store port, site usage vs quota from `navigator.storage.estimate()` as a `<meter>` (explicit `role="meter"`, `aria-valuenow/min/max`, `aria-valuetext`) plus "X MB de Y GB", alert above 80% of the quota, persistence status from `persisted()` with "Proteger almacenamiento" calling `persist()` (result shown in the panel and a toast), backup hint. Read on mount, after an import and with "Actualizar". Without `navigator.storage` or IndexedDB it says so instead. Pure helpers in `lib/storageUsage.js` (`formatBytes`, `usagePercent`, `isNearQuota`).
  - RED: `storageUsage.test.js` failed to load (module missing) and the 5 panel UI tests failed; 260 existing tests passed.
  - GREEN: 22 files / 279 tests passed. Exception: jsdom has no StorageManager; the tests install a fake `navigator.storage`.
  - Verification: `corepack pnpm test`: 279 passed; `corepack pnpm build`: built OK.

## Next step
Manual smoke in Chrome (back up the real data first): add/replace/remove a photo, reload, check a 4 MB photo is stored at ≤ 300 KB in the storage panel, export → import in a clean profile, private window (images unavailable message). Then PR (`single-pr`).
