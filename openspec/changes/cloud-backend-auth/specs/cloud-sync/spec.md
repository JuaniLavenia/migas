# Cloud Sync Specification

## Purpose

Client-side behavior that makes the optional cloud account fully additive: with no session, the app MUST behave exactly as today; with a session, local writes stay authoritative and sync happens best-effort in the background.

## Requirements

### Requirement: Local-Only Mode (No Session)

When no authenticated session exists, the system MUST behave exactly as the current local-only application: every read and write MUST go only to local storage, and the client MUST NOT issue any network request to the backend.

#### Scenario: No network calls without a session

- GIVEN no active session
- WHEN the user creates, edits, or deletes an ingredient or recipe
- THEN the change is applied to local storage only and zero HTTP requests are sent to the API

### Requirement: Login-Time Merge

The first time a session is established on a device holding existing local data, the client MUST create an automatic local JSON backup before merging, then merge local and cloud data by unioning records by `id` with the cloud version winning any collision, and MUST persist the merged snapshot as both the new local state and the new cloud baseline.

#### Scenario: Backup precedes any overwrite

- GIVEN existing local data on a device with no prior session
- WHEN the user logs in for the first time on that device
- THEN a JSON backup of the pre-merge local data is produced before any local record is overwritten

#### Scenario: Local-only ids survive the merge

- GIVEN local data containing ids not present on the cloud
- WHEN the login-time merge runs
- THEN those ids are present in the resulting merged dataset

#### Scenario: Cloud wins on id collision

- GIVEN a local record and a cloud record sharing the same `id` with differing content
- WHEN the login-time merge runs
- THEN the resulting dataset contains the cloud version of that `id`

#### Scenario: Cloud tombstones are respected

- GIVEN an id tombstoned on the cloud that still exists in local data
- WHEN the login-time merge runs
- THEN that id is absent from the resulting merged dataset

### Requirement: Write-Through Mutations

While a session is active, every ingredient/recipe mutation (create, update, delete) MUST update the local store immediately (optimistic) and MUST trigger the corresponding API call as part of the same action.

#### Scenario: Mutation with an active session

- GIVEN an active session
- WHEN the user creates, edits, or deletes an ingredient or recipe
- THEN the UI reflects the change immediately from the local store, and the matching API call is issued for the same operation

### Requirement: Pending-Sync Recovery

If a write-through API call fails while a session is active, the system MUST NOT block or revert the local edit. It MUST mark a `pendingSync` state and MUST retry by pushing the full current snapshot (idempotent upsert by `id`) automatically on reconnect or when the user triggers "Sincronizar ahora".

#### Scenario: Network failure does not block editing

- GIVEN an active session with the backend unreachable
- WHEN the user edits an ingredient or recipe
- THEN the local edit succeeds and is visible immediately, and the system marks a pending-sync state instead of failing the edit

#### Scenario: Automatic retry on reconnect

- GIVEN a pending-sync state caused by a prior network failure
- WHEN connectivity to the backend is restored
- THEN the system automatically re-pushes the full current local snapshot

#### Scenario: Manual sync trigger

- GIVEN an active session, with or without a pending-sync state
- WHEN the user selects "Sincronizar ahora"
- THEN the system pushes the full current local snapshot to the backend

### Requirement: Logout Behavior

Logging out MUST clear the authentication token and user identity only. It MUST NOT delete or alter any local ingredient or recipe data.

#### Scenario: Local data survives logout

- GIVEN a session with synced local data
- WHEN the user logs out
- THEN the token and user identity are cleared, all local ingredients and recipes remain unchanged, and the app returns to local-only mode

## Known Limitations

- An item deleted while offline (no local tombstone is created, out of scope for this change) MAY reappear after the next sync if the cloud copy still exists. Accepted for this change given backup-oriented, largely single-device usage; not covered by any requirement above.
</content>
</invoke>
