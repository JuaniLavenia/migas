# Proposal: Optional cloud account + self-hosted backend (cloud-backend-auth)

## Intent

Recipe and ingredient data lives only in one browser's localStorage. Clearing site data or switching device loses real costing work, and the only recovery is a manual JSON backup. Add an **optional** account so the user can back up and share data across devices, without giving up the current zero-friction local-only experience.

## Scope

### In Scope

- `server/`: Express + Mongoose + JWT API — signup, login, `me`, owner-scoped CRUD for ingredients and recipes, soft-delete tombstones.
- Security: bcryptjs hashing, `zod` input validation, `express-rate-limit` on auth routes, 7-day JWT (no refresh), CORS allow-list.
- Frontend: auth UI inside Settings ("Cuenta") + real session/sync status in the topbar (replaces hardcoded "Guardado localmente").
- Hybrid sync: login-time merge, write-through mutations, pending-sync recovery, safety backup before first merge.
- `deleteRecipe` added to the store and UI (parity with ingredients, required for tombstone semantics).
- Vitest introduced, scoped to auth, owner-scoping, and the localStorage snapshot reader.
- `server/.env.example`, root `.env.example` (`VITE_API_URL`).

### Out of Scope

- Hosting setup (Render/Atlas dashboards, DNS, env vars there) — manual, see Dependencies.
- Refresh tokens, email verification, password reset, multi-user sharing.
- `react-router-dom` and `@tanstack/react-query` stay unused — reads come from the local store, so server-state caching and route guards buy nothing here.
- Real-time/bidirectional sync, per-operation offline queue, local tombstones, CI workflow, component/e2e tests.
- Referential integrity for `items[].ingredientId` — today's lenient silent-skip behavior is preserved.

## Decisions Resolved

| # | Decision | Rationale |
|---|---|---|
| 1 | Two independent pnpm projects, **no** `pnpm-workspace.yaml`; `server/` has its own `package.json` + `pnpm-lock.yaml` + pinned `packageManager` | Nothing is shared (plain JS, no types package). A workspace would force the Render build to resolve frontend deps; `server/` as deploy root stays `pnpm install --frozen-lockfile && pnpm start` |
| 2 | Local-first hybrid: no session = today's behavior, zero network | Preserves the current UX and keeps the app usable with no account |
| 3 | On login: auto JSON backup, then union-by-id merge (existing `mergeById`), **cloud wins on id collision**, tombstoned ids removed, result pushed back as a full snapshot | Deterministic, one-sentence rule, never loses local-only records; backup makes the collision rule recoverable |
| 4 | After merge: write-through — store updates optimistically, API call follows when a session exists | No sync engine, no queue |
| 5 | Offline while logged in: editing is **never blocked**; failures set a `pendingSync` flag and re-push the full snapshot (idempotent upsert by `id`) on reconnect or via "Sincronizar ahora" | Local-first guarantee; avoids an offline lock |
| 6 | JWT in `localStorage`, `Authorization: Bearer` only | Cross-origin frontend/backend with no BFF; httpOnly cookies would add SameSite=None + CSRF handling. Residual XSS risk accepted (see Risks) |
| 7 | Client-generated `uuid` stays the business key: compound unique index `{ owner, id }`; Mongo `_id` is never exposed | Enables offline id generation and id-based merge |
| 8 | Vitest in scope, minimal: password/login flow, JWT rejection paths, cross-user access denial, `{state, version}` snapshot parsing | Auth is security-sensitive; untested owner-scoping is the one bug class that leaks data |
| 9 | Logout clears token and identity only; local data stays | The app must keep working as local-only afterwards |

## Capabilities

### New Capabilities

- `user-auth`: signup, login, session identity, password hashing, JWT issue/verify, rate limiting, input validation.
- `recipe-data-api`: owner-scoped REST CRUD for ingredients and recipes, soft-delete tombstones, snapshot merge endpoint.
- `cloud-sync`: optional-session client behavior — local-only mode, login-time merge, write-through, pending-sync recovery, logout.

### Modified Capabilities

- None (`openspec/specs/` is empty; this change establishes the first specs).

## Approach

Additive backend in `server/` (`src/{models,routes,middleware,lib}`) with a `User` doc and `owner`-scoped `Ingredient`/`Recipe` docs keyed by `{ owner, id }`. A new `useAuthStore` (Zustand persist) holds token, user, and sync status. A thin `src/lib/api` client attaches the bearer token. `useRecipeStore` mutators keep writing locally first, then call the API when a session exists. `mergeById` is extracted from the store into `src/lib/` so login-merge, backup import, and the server snapshot endpoint share one algorithm.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `server/` | New | Express app, models, auth, CRUD, tests |
| `src/stores/useRecipeStore.js` | Modified | `deleteRecipe`, write-through, extracted merge |
| `src/stores/useAuthStore.js` | New | Token, user, sync status |
| `src/lib/api/`, `src/lib/mergeById.js` | New | Fetch client, shared merge |
| `src/features/settings/SettingsView.jsx` | Modified | "Cuenta" section, sync actions |
| `src/features/recipes/*` | Modified | Delete-recipe affordance |
| `src/App.jsx` | Modified | Real session/sync status in topbar |
| `package.json` (root) | Modified | Vitest dev dependency |
| `.gitignore` | None | Already ignores `.env` at any depth |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Login merge loses a local edit (cloud wins) | Med | Automatic JSON backup before merge + merge summary shown to user |
| Raw localStorage read misses `{state, version}` wrapper | Med | Dedicated unit test; single shared reader function |
| XSS exfiltrates the JWT from localStorage | Low | 7-day expiry, no third-party scripts, no `dangerouslySetInnerHTML` |
| Item deleted while offline reappears after sync | Med | Documented limitation; server tombstones cover the online path |
| `mongodb-memory-server` binary download flaky on Windows | Med | Fall back to mocked-model unit tests for the same assertions |
| Exceeds the 400-line review budget | High | `sdd-tasks` must forecast and propose chained PRs (backend → client sync → tests) |

## Rollback Plan

Everything is additive and the local store stays authoritative, so reverting the `backend` branch restores today's exact behavior with local data intact. Order: revert frontend commits (app returns to local-only), stop the hosted server, then optionally drop the Atlas collections. No local-data migration is destructive, so no data recovery step is needed.

## Dependencies

- Manual, user-owned: Atlas cluster + DB user, backend host (e.g. Render) with `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`; frontend `VITE_API_URL`.
- New server deps: `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `zod`, `express-rate-limit`, `cors`, `dotenv`.

## Success Criteria

- [ ] With no account, the app behaves exactly as today and issues zero network requests.
- [ ] Signup/login from a device with local data merges without losing any record; a backup file is produced first.
- [ ] Logging in on a second device shows the same ingredients and recipes.
- [ ] Mutations while logged in persist to Atlas; with the API unreachable, edits still succeed locally and reconcile afterwards.
- [ ] A request with another user's token or no token cannot read or write the user's data (covered by tests).
- [ ] `pnpm build` (root) and `pnpm test` (root and `server/`) pass.
