# Design: Optional cloud account + self-hosted backend (cloud-backend-auth)

> Deviates from the default 800-word design budget by explicit request: the orchestrator asked for exact Mongoose schemas, two sequence diagrams, the full API contract, and the Vitest setup in this artifact.

## Technical Approach

Additive `server/` Express app (own pnpm project, no workspace) exposing an owner-scoped REST API keyed by the client-generated `uuid`. The frontend keeps `useRecipeStore` as the authoritative read path; a new `useAuthStore` holds session state and a thin `src/lib/api` client performs write-through calls that no-op without a session. `mergeById` moves out of the store into `src/lib/` so login-merge, backup import, and snapshot reconciliation share one algorithm. All idempotent writes are `PUT`-with-upsert so a failed call can be retried, or superseded by a full snapshot push, without duplicate records.

## Architecture Decisions

### Decision: Business key is a schema path named `id`, not a remapped `uid`

**Choice**: Declare a real `id: String` path on `Ingredient`/`Recipe` and disable the Mongoose `id` virtual via schema option `{ id: false }`. Unique compound index `{ owner: 1, id: 1 }`. `toJSON` strips `_id`, `__v`, `owner`.
**Alternatives considered**: (a) name the server field `uid` and map in the client; (b) use `_id` as the uuid.
**Rationale**: (a) forces a mapping layer in every client call for no benefit; (b) breaks tombstones (a re-created uuid would collide globally instead of per-owner). Mongoose auto-creates an `id` virtual that shadows a same-named path — `{ id: false }` is the non-obvious guard that makes option (c) safe, and is the single highest-value gotcha in the backend.

### Decision: `PUT`-with-upsert for every data write, no `POST` create route

| Option | Tradeoff | Decision |
|---|---|---|
| `POST` create + `PUT` update | Client must know whether the record exists on the server; a retried `POST` after a network timeout can duplicate | Rejected |
| `PUT /:id` upsert | Add and update are one idempotent call; retry and snapshot push are safe by construction | **Chosen** |

### Decision: Soft delete via `deletedAt`, tombstones returned by the snapshot

**Choice**: `DELETE` sets `deletedAt: Date`. `GET /api/snapshot` returns live documents plus `tombstones: { ingredients: [id], recipes: [id] }`. Login-merge removes tombstoned ids from the merged result.
**Alternatives considered**: hard delete; a separate `tombstones` collection.
**Rationale**: hard delete makes "cloud wins" undecidable (absence is indistinguishable from never-synced). A separate collection duplicates the owner-scoping surface for no gain. Accepted limitation, confirmed by the user: an item deleted **offline** reappears after sync — usage is backup-oriented, not active multi-device.

### Decision: Owner scoping through one query helper, never ad hoc per route

**Choice**: `server/src/lib/scope.js` exports `ownedFilter(req, extra)` returning `{ owner: req.user._id, deletedAt: null, ...extra }`. Every data query builds its filter from it.
**Alternatives considered**: repeating `{ owner: req.user._id }` inline in each handler.
**Rationale**: untested/forgotten owner scoping is the one bug class that leaks another user's data. One chokepoint is testable with a mocked model by asserting the filter shape.

### Decision: Client wiring by hook registration, not cross-store imports

**Choice**: `src/lib/api/client.js` imports nothing from stores; it exposes `setAuthHooks({ getToken, onUnauthorized })`, called once at module scope from `useAuthStore.js`. `src/lib/sync/syncClient.js` receives store state as arguments, never imports `useRecipeStore`.
**Alternatives considered**: the api client importing `useAuthStore` directly.
**Rationale**: `useAuthStore` must call the api client for login, so a direct import back would create a cycle. Registration keeps the dependency graph one-directional: `stores → lib/sync → lib/api`.

### Decision: `mergeById` extracted verbatim, semantics unchanged

**Choice**: Move the existing function from `useRecipeStore.js` to `src/lib/mergeById.js` with no behavior change (union by id, shallow per-field merge, incoming wins). Login-merge calls it as `mergeById(local, cloud)` so cloud is "incoming" and therefore wins on collision.
**Rationale**: the proposal's collision rule is exactly the existing function's semantics with the arguments in that order — no new algorithm to review or test twice.

## Data Flow

    useRecipeStore (authoritative reads, optimistic writes)
            │ state passed as args
            ▼
    lib/sync/syncClient  ──uses──▶  useAuthStore (token, user, syncStatus)
            │                              │ registers getToken/onUnauthorized
            ▼                              ▼
    lib/api/client (Bearer, ApiError) ──▶  server/ Express ──▶ Mongo (owner-scoped)

### Sequence: login-time merge

    User      SettingsView    useAuthStore    syncClient      api        server
     │  submit    │                │              │            │           │
     ├───────────▶│  login()       │              │            │           │
     │            ├───────────────▶│ POST /auth/login ────────▶├──────────▶│
     │            │                │◀──── 200 { token, user } ─┤◀──────────┤
     │            │                │ set token/user, syncStatus="merging"  │
     │            │                ├─ downloadBackup(local)  (auto .json)  │
     │            │                ├─────────────▶│ GET /snapshot ───────▶│
     │            │                │              │◀── 200 { ing, rec, tombstones }
     │            │                │              ├─ merged = mergeById(local, cloud)
     │            │                │              ├─ drop tombstoned ids
     │            │                │              ├─ PUT /snapshot(merged) ▶│
     │            │                │              │◀──── 200 { snapshot } ──┤
     │            │                │◀── merged ───┤            │           │
     │            │  hydrate(merged) via useRecipeStore.replaceAll()       │
     │◀─ toast "N insumos, M recetas sincronizadas" ─┤        │           │

Failure before `PUT /snapshot` leaves `syncStatus="pending"` and the local store untouched; the backup file is already on disk.

### Sequence: write-through mutation (success and network failure)

    UI        useRecipeStore     syncClient        server
     │ save       │                  │               │
     ├───────────▶│ set(local state) │  (optimistic, always succeeds)
     │            ├─────────────────▶│ if no token → return (no request)
     │            │                  ├─ PUT /api/ingredients/:id ──▶│
     │   ── success ──               │◀──────── 200 ────────────────┤
     │            │◀── syncStatus="synced" ─┤       │
     │   ── network failure ──       │               │
     │            │                  ├─ PUT … ──▶ ✗ (offline / 5xx)
     │            │◀── syncStatus="pending", pendingSync=true ──────┤
     │  edits keep working locally; on reconnect or "Sincronizar ahora":
     │            ├─────────────────▶│ PUT /api/snapshot(full local) ▶│
     │            │◀── syncStatus="synced", pendingSync=false ───────┤

A `401` from any call routes to `onUnauthorized` → `useAuthStore.clearSession()` → app returns to local-only mode with data intact.

## File Changes

| File | Action | Description |
|---|---|---|
| `server/package.json` | Create | Own pnpm project, pinned `packageManager`, `start`/`dev`/`test` scripts, `type: module` |
| `server/pnpm-lock.yaml` | Create | Separate lockfile — deploy root is `server/` |
| `server/.env.example` | Create | `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN` |
| `server/src/server.js` | Create | Loads env, connects Mongoose, `app.listen` |
| `server/src/app.js` | Create | Express app: `cors` allow-list, `express.json({ limit: "2mb" })`, route mounts, 404, error handler |
| `server/src/models/User.js` | Create | Schema below |
| `server/src/models/Ingredient.js` | Create | Schema below |
| `server/src/models/Recipe.js` | Create | Schema below |
| `server/src/middleware/auth.js` | Create | Bearer verify → `req.user`; 401 taxonomy |
| `server/src/middleware/validate.js` | Create | `validate(schema, "body"\|"params")` zod wrapper → 400 |
| `server/src/middleware/errorHandler.js` | Create | Single `{ error: { code, message, details } }` envelope |
| `server/src/middleware/rateLimit.js` | Create | `express-rate-limit`, auth routes only |
| `server/src/lib/token.js` | Create | `sign(user)` / `verify(token)`, 7d expiry |
| `server/src/lib/scope.js` | Create | `ownedFilter(req, extra)` chokepoint |
| `server/src/lib/errors.js` | Create | `ApiError(status, code, message)` |
| `server/src/schemas/auth.js` | Create | zod: email, password min 8 |
| `server/src/schemas/data.js` | Create | zod: ingredient, recipe, snapshot bodies |
| `server/src/routes/auth.js` | Create | `signup`, `login`, `me` |
| `server/src/routes/ingredients.js` | Create | `PUT /:id` upsert, `DELETE /:id` tombstone |
| `server/src/routes/recipes.js` | Create | Same shape as ingredients |
| `server/src/routes/snapshot.js` | Create | `GET` (+tombstones), `PUT` (bulk upsert) |
| `server/vitest.config.js` | Create | Node env, `tests/**/*.test.js` |
| `server/tests/unit/*.test.js` | Create | Auth + scoping with mocked models |
| `server/tests/integration/*.test.js` | Create | Gated on `MONGO_TEST=memory` |
| `src/lib/mergeById.js` | Create | Extracted from the store, unchanged semantics |
| `src/lib/localSnapshot.js` | Create | `parseLocalSnapshot(raw)` — handles the `{ state, version }` wrapper |
| `src/lib/api/client.js` | Create | `request()`, `ApiError`, `setAuthHooks` |
| `src/lib/api/endpoints.js` | Create | Typed-by-convention call wrappers per route |
| `src/lib/sync/syncClient.js` | Create | `loginMerge`, `pushSnapshot`, `writeThrough` |
| `src/stores/useAuthStore.js` | Create | zustand + persist: `token`, `user`, `syncStatus`, `pendingSync`, `lastSyncAt` |
| `src/stores/useRecipeStore.js` | Modify | Import `mergeById`; add `deleteRecipe`, `replaceAll`; write-through in mutators |
| `src/features/settings/SettingsView.jsx` | Modify | "Cuenta" section: signup/login/logout, "Sincronizar ahora", sync summary |
| `src/features/recipes/RecipesView.jsx` | Modify | Delete-recipe affordance (parity with ingredients) |
| `src/App.jsx` | Modify | Real session/sync status in topbar, wire `deleteRecipe`, avatar from `user.email` |
| `package.json` (root) | Modify | Add `vitest` devDep, `test` script |
| `vitest.config.js` (root) | Create | Node env, `src/**/*.test.js` |
| `.env.example` (root) | Create | `VITE_API_URL` |

## Interfaces / Contracts

### Mongoose schemas

```js
// server/src/models/User.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => ({ email: ret.email, createdAt: ret.createdAt }) },
  },
);

// server/src/models/Ingredient.js
const ingredientSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    id: { type: String, required: true },          // client uuid = business key
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "" },
    unit: { type: String, default: "g" },
    packSize: { type: Number, default: 0 },
    packCost: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, id: false, toJSON: { transform: publicShape } },
);
ingredientSchema.index({ owner: 1, id: 1 }, { unique: true });

// server/src/models/Recipe.js
const recipeItemSchema = new mongoose.Schema(
  { ingredientId: { type: String, required: true }, quantity: { type: Number, default: 0 } },
  { _id: false },
);
const recipeSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    yield: { type: Number, default: 1 },
    margin: { type: Number, default: 0 },
    extras: { type: Number, default: 0 },
    updated: { type: String, default: "" },        // display label, preserved verbatim
    items: { type: [recipeItemSchema], default: [] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, id: false, toJSON: { transform: publicShape } },
);
recipeSchema.index({ owner: 1, id: 1 }, { unique: true });
```

`publicShape` drops `_id`, `__v`, `owner`, and `deletedAt`. `id: false` is mandatory — without it Mongoose's `id` virtual shadows the business key. `items[].ingredientId` stays a soft reference (no `ref`/populate): today's silent-skip behavior is preserved per proposal scope.

### API contract

Base `VITE_API_URL` + `/api`. All data routes require `Authorization: Bearer <jwt>`.

| Method | Path | Auth | Request body | 2xx response |
|---|---|---|---|---|
| POST | `/api/auth/signup` | no | `{ email, password }` | `201 { token, user: { email, createdAt } }` |
| POST | `/api/auth/login` | no | `{ email, password }` | `200 { token, user: { email, createdAt } }` |
| GET | `/api/auth/me` | yes | — | `200 { user: { email, createdAt } }` |
| GET | `/api/snapshot` | yes | — | `200 { ingredients: [], recipes: [], tombstones: { ingredients: [id], recipes: [id] }, serverTime }` |
| PUT | `/api/snapshot` | yes | `{ ingredients: [], recipes: [] }` | `200` same shape as `GET` |
| PUT | `/api/ingredients/:id` | yes | full ingredient (minus `id`) | `200 { ingredient }` |
| DELETE | `/api/ingredients/:id` | yes | — | `204` |
| PUT | `/api/recipes/:id` | yes | full recipe (minus `id`) | `200 { recipe }` |
| DELETE | `/api/recipes/:id` | yes | — | `204` |

Error envelope: `{ "error": { "code": "…", "message": "…", "details": [] } }`

| Status | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | zod failure; `details` carries `issues` |
| 401 | `MISSING_TOKEN` / `INVALID_TOKEN` / `TOKEN_EXPIRED` | auth middleware |
| 401 | `INVALID_CREDENTIALS` | login — same code and timing for unknown email and wrong password |
| 404 | `NOT_FOUND` | `DELETE` of an id not owned by the caller (never `403`, to avoid confirming existence) |
| 409 | `EMAIL_TAKEN` | signup on existing email |
| 429 | `TOO_MANY_REQUESTS` | auth rate limit: 10 requests / 15 min / IP |
| 500 | `INTERNAL` | unexpected; message is generic, details omitted |

`PUT /api/snapshot` uses one `bulkWrite` per collection with `updateOne({ owner, id }, { $set: … }, { upsert: true })`. It never resurrects tombstones: ids present in the request that are tombstoned server-side are skipped, and the response reflects the true post-write state.

### `useAuthStore` shape

```js
// persist name: "miga-auth-storage"; partialize keeps { token, user, lastSyncAt, pendingSync }
{
  token: null, user: null,
  syncStatus: "local",   // "local" | "merging" | "syncing" | "synced" | "pending" | "error"
  pendingSync: false, lastSyncAt: null, lastError: null,
  signup, login, logout,      // logout clears token/user only — local data stays
  clearSession,               // invoked by the api client's 401 hook
  syncNow,                    // full snapshot push, clears pendingSync
}
```

`useRecipeStore` gains `replaceAll({ ingredients, recipes })` (hydration after merge) and `deleteRecipe(id)`. Existing mutator signatures are unchanged, so the no-session path is byte-for-byte today's behavior with zero requests.

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Unit (server) | password hash/verify, token sign/verify, expired and tampered token rejection, `ownedFilter` always injects `owner`, route handlers reject a foreign-owner id with `404` | `vi.mock` the Mongoose model; assert the filter object passed to `findOneAndUpdate`/`findOne` contains the caller's `owner` |
| Unit (client) | `mergeById` union + collision (incoming wins), `parseLocalSnapshot` reads `{ state, version }` and returns empty arrays for legacy/invalid/absent raw | Pure functions; `parseLocalSnapshot(raw: string)` takes the raw string so no DOM or `localStorage` stub is needed |
| Integration (server, optional) | signup → login → `PUT /api/ingredients/:id` → `GET /api/snapshot` with two users, cross-user denial | `supertest` + `mongodb-memory-server`, **skipped unless `MONGO_TEST=memory`** |
| Component / E2E | — | Out of scope (proposal). `msw` stays an unused dependency. |

**Vitest layout and the Windows fallback.** Two independent configs, no shared setup: root `vitest.config.js` (`environment: "node"`, `include: ["src/**/*.test.js"]`) run by root `pnpm test`; `server/vitest.config.js` (`environment: "node"`, `include: ["tests/**/*.test.js"]`) run by `pnpm test` inside `server/`. The default suite in both projects is pure-unit and downloads nothing. `mongodb-memory-server` is a `server/` devDependency used only by `tests/integration/`, whose files call `describe.skipIf(!process.env.MONGO_TEST)`. The mocked-model unit tests carry the same owner-scoping and auth assertions, so a failed binary download on Windows degrades confidence in wiring, never in the security assertions, and never fails CI-equivalent local runs.

## Threat Matrix

N/A — no routing (in the command/shell sense), shell command, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The change's adversarial surface is the HTTP boundary, covered by the Vitest server unit rows above: missing/invalid/expired token, cross-owner read, cross-owner write, cross-owner delete, oversized body (`express.json` limit), unvalidated payload, and auth brute force (rate limit). Each of those is a required test in `tasks.md`.

## Migration / Rollout

No data migration. Work stays on the existing `backend` branch (do not create others) and lands as **one PR to `main`** — the user accepted `size:exception`, so `sdd-tasks` must not slice this into chained PRs. Rollout is env-gated by absence: with no `VITE_API_URL` and no session the app is exactly today's local-only build. Backend hosting (Atlas, Render env vars) stays manual and out of scope. Rollback per proposal: revert frontend commits, stop the server, optionally drop collections.

## Open Questions

- [ ] None blocking. Accepted, non-blocking: an item deleted while offline reappears after the next sync (confirmed acceptable — backup-oriented usage).
