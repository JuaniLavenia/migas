# Tasks: Optional cloud account + self-hosted backend (cloud-backend-auth)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2000-2600 (new `server/` app + tests, new frontend `lib/`+stores, UI wiring, frontend tests) |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR — user accepted `size:exception` |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

`size:exception` already confirmed explicitly by the user for this change; do not propose chained/stacked PRs or split the work into separate PR-sized units. All work lands on the existing `backend` branch as one PR to `main`.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Whole change (backend + frontend + tests) | PR 1 (only PR) | `pnpm test` (root), `pnpm test` (`server/`) | `pnpm dev` (frontend) + `pnpm start` (`server/`) against local Mongo/Atlas | Revert frontend commits, stop server, optionally drop Atlas collections (proposal Rollback Plan) |

## Phase 1: Backend Models + Auth

- [ ] 1.1 `server/package.json` + `pnpm-lock.yaml`: own pnpm project, pinned `packageManager`, `type: module`, `start`/`dev`/`test` scripts; add `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `zod`, `express-rate-limit`, `cors`, `dotenv`.
- [ ] 1.2 `server/.env.example`: `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`.
- [ ] 1.3 `server/src/models/User.js`, `Ingredient.js`, `Recipe.js` per design schemas (`id: false`, `{owner,id}` unique index, `publicShape` toJSON).
- [ ] 1.4 `server/src/lib/token.js` (sign/verify, 7d expiry), `server/src/lib/scope.js` (`ownedFilter`), `server/src/lib/errors.js` (`ApiError`).
- [ ] 1.5 `server/src/schemas/auth.js` (email, password min 8), `server/src/schemas/data.js` (ingredient/recipe/snapshot bodies).
- [ ] 1.6 `server/src/middleware/auth.js`: bearer verify → `req.user`; 401 `MISSING_TOKEN`/`INVALID_TOKEN`/`TOKEN_EXPIRED`.
- [ ] 1.7 `server/src/routes/auth.js`: `signup` (hash, 409 `EMAIL_TAKEN`), `login` (generic 401 `INVALID_CREDENTIALS`), `me`.
- [ ] 1.8 `server/src/server.js` (env load, mongoose connect, listen) and skeleton `server/src/app.js` (json parser, mount `/api/auth`).

## Phase 2: Backend CRUD Routes + Snapshot

- [ ] 2.1 `server/src/routes/ingredients.js`: `PUT /:id` upsert via `ownedFilter`, `DELETE /:id` soft-delete (`deletedAt`), `GET` list excludes tombstones.
- [ ] 2.2 `server/src/routes/recipes.js`: same shape as ingredients.
- [ ] 2.3 `server/src/routes/snapshot.js`: `GET` returns live docs + `tombstones`; `PUT` bulk upsert per collection, never resurrects a cloud-tombstoned id.
- [ ] 2.4 Wire all data routes into `server/src/app.js` under `/api`, protected by `auth.js` middleware.

## Phase 3: Backend Security Middleware

- [ ] 3.1 `server/src/middleware/validate.js`: `validate(schema, "body"|"params")` zod wrapper → 400 `VALIDATION_ERROR`.
- [ ] 3.2 `server/src/middleware/rateLimit.js`: `express-rate-limit`, 10 req/15min/IP, applied only to auth routes.
- [ ] 3.3 `server/src/middleware/errorHandler.js`: single `{error:{code,message,details}}` envelope, mounted last in `app.js`.
- [ ] 3.4 `server/src/app.js`: `cors` allow-list from `CORS_ORIGIN`, `express.json({limit:"2mb"})`, 404 handler.

## Phase 4: Backend Tests

- [ ] 4.1 `server/vitest.config.js` (node env, `tests/**/*.test.js`).
- [ ] 4.2 `tests/unit/auth.test.js`: hash/verify, signup duplicate email, wrong-password/unknown-email login (same generic error) — user-auth Login/Signup scenarios.
- [ ] 4.3 `tests/unit/token.test.js`: missing/invalid/expired token rejected, valid token resolves identity — Session Verification scenarios.
- [ ] 4.4 `tests/unit/scope.test.js`: mocked model asserts `ownedFilter` always injects `owner`; cross-user read/update/delete denied as 404, not 403.
- [ ] 4.5 `tests/unit/rateLimit.test.js`: exceeding the window rejects without touching account state.
- [ ] 4.6 `tests/unit/validation.test.js`: oversized body and invalid payload rejected with `VALIDATION_ERROR`.
- [ ] 4.7 `tests/unit/snapshot.test.js`: first-merge adopts local-only ids, cloud wins collision, cloud tombstones excluded from result.
- [ ] 4.8 `tests/integration/flow.test.js` (`supertest` + `mongodb-memory-server`, `describe.skipIf(!process.env.MONGO_TEST)`): signup → login → `PUT` ingredient → `GET` snapshot, two users, cross-user denial end-to-end.

## Phase 5: Frontend API Client + Sync Client

- [ ] 5.1 `src/lib/mergeById.js`: extract verbatim from `useRecipeStore.js`, unchanged semantics (union by id, incoming wins).
- [ ] 5.2 `src/lib/localSnapshot.js`: `parseLocalSnapshot(raw)` — handles `{state, version}`, returns empty arrays for legacy/invalid/absent raw.
- [ ] 5.3 `src/lib/api/client.js`: `request()`, `ApiError`, `setAuthHooks({getToken, onUnauthorized})`.
- [ ] 5.4 `src/lib/api/endpoints.js`: wrappers for signup/login/me/snapshot/ingredients/recipes.
- [ ] 5.5 `src/lib/sync/syncClient.js`: `loginMerge`, `pushSnapshot`, `writeThrough` — receives store state as args, imports neither store.

## Phase 6: Frontend useAuthStore

- [ ] 6.1 `src/stores/useAuthStore.js`: zustand+persist (`"miga-auth-storage"`, partialize `{token,user,lastSyncAt,pendingSync}`); `token`, `user`, `syncStatus`, `pendingSync`, `lastSyncAt`, `lastError`; `signup`/`login`/`logout`/`clearSession`/`syncNow`.
- [ ] 6.2 Call `setAuthHooks` once at module scope in `useAuthStore.js`; register `onUnauthorized` → `clearSession`.

## Phase 7: useRecipeStore / SettingsView / RecipesView / App.jsx

- [ ] 7.1 `src/stores/useRecipeStore.js`: import `mergeById` from `src/lib/`, remove the local copy.
- [ ] 7.2 Add `deleteRecipe(id)` mutator (parity with ingredient delete) and `replaceAll({ingredients,recipes})` for post-merge hydration.
- [ ] 7.3 Wire write-through: each mutator calls `syncClient` after the local update only when a session exists; zero network calls with no session.
- [ ] 7.4 `src/features/settings/SettingsView.jsx`: add "Cuenta" section — signup/login/logout forms, "Sincronizar ahora", merge/sync summary toast.
- [ ] 7.5 `src/features/recipes/RecipesView.jsx`: add delete-recipe affordance wired to `deleteRecipe`.
- [ ] 7.6 `src/App.jsx`: replace hardcoded "Guardado localmente" with real session/`syncStatus` in the topbar, wire `deleteRecipe`, avatar from `user.email`.

## Phase 8: Frontend Tests + Root Config

- [ ] 8.1 `vitest.config.js` (root, node env, `src/**/*.test.js`); add `vitest` devDependency and `test` script to root `package.json`.
- [ ] 8.2 `.env.example` (root): `VITE_API_URL`.
- [ ] 8.3 `src/lib/mergeById.test.js`: union by id, cloud/incoming wins collision — Login-Time Merge scenarios.
- [ ] 8.4 `src/lib/localSnapshot.test.js`: parses `{state,version}`, empty arrays for legacy/invalid/absent raw.
- [ ] 8.5 `src/lib/sync/syncClient.test.js`: `writeThrough` no-ops with no session (Local-Only Mode scenario), `loginMerge` drops cloud-tombstoned ids, failure sets `pendingSync` and `syncNow` retries.
