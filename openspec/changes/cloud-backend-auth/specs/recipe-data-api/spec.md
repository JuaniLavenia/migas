# Recipe Data API Specification

## Purpose

Owner-scoped REST CRUD for ingredients and recipes with soft-delete tombstones and a snapshot-merge endpoint that backs cloud sync, so a user's cloud data is never visible or writable by another user.

## Requirements

### Requirement: Owner-Scoped CRUD

Every authenticated CRUD operation (create, list, read, update) on an ingredient or recipe MUST be scoped to the requesting user's own records, using the owner derived from the verified JWT identity — never from client-supplied input.

#### Scenario: Created record is scoped to the authenticated owner

- GIVEN an authenticated user
- WHEN that user creates an ingredient or recipe
- THEN the stored record's owner is the authenticated user's identity, regardless of any owner value sent by the client

#### Scenario: List returns only the caller's own records

- GIVEN two users each with their own ingredients and recipes
- WHEN one user requests their list of ingredients or recipes
- THEN only that user's own records are returned

### Requirement: Cross-User Access Denial

The system MUST NOT allow a user to read, update, or delete another user's ingredient or recipe, even when the target `id` exists for a different owner. Such requests MUST be indistinguishable in effect from the record not existing.

#### Scenario: Reading another user's record is denied

- GIVEN a record owned by user A
- WHEN user B requests that record by its `id`
- THEN the request is denied and no data belonging to user A is returned

#### Scenario: Updating another user's record is denied

- GIVEN a record owned by user A
- WHEN user B attempts to update that record
- THEN the request is denied and the record owned by user A is left unchanged

#### Scenario: Deleting another user's record is denied

- GIVEN a record owned by user A
- WHEN user B attempts to delete that record
- THEN the request is denied, no tombstone is created, and the record owned by user A is left unchanged

### Requirement: Soft-Delete Tombstones

Deleting an ingredient or recipe MUST mark it as a tombstone scoped to its owner rather than removing it from the database, so subsequent snapshot merges can propagate the deletion.

#### Scenario: Delete produces a tombstone, not a hard delete

- GIVEN an ingredient or recipe owned by the authenticated user
- WHEN the user deletes it
- THEN the record is marked as a tombstone for that owner and `id`, and a subsequent list of active records excludes it

### Requirement: Snapshot Merge Endpoint

The system MUST provide an endpoint that accepts a client's full local snapshot (ingredients and recipes) and returns the merged result computed by unioning the cloud's and the client's records by `id`. On an `id` collision the cloud record MUST win. Any `id` tombstoned on the cloud MUST be excluded from the result even if the client submitted it as active.

#### Scenario: First merge adopts local-only records

- GIVEN an owner with no prior cloud records
- WHEN that owner submits a local snapshot to the merge endpoint
- THEN the merged result contains all submitted records, now persisted as the owner's cloud data

#### Scenario: Merge resolves collisions in favor of the cloud

- GIVEN a cloud record and a submitted local record sharing the same `id` with different content
- WHEN the merge endpoint processes the submission
- THEN the merged result contains the cloud version of that `id`

#### Scenario: Merge excludes cloud tombstones

- GIVEN an `id` tombstoned in the cloud
- WHEN a client submits that same `id` as an active record in its local snapshot
- THEN the merged result does not include that `id` as an active record

### Requirement: Business Key Integrity

Each ingredient/recipe MUST be uniquely identified within an owner by a client-generated `id`, enforced via a compound unique index on `{ owner, id }`. The database-internal identifier MUST NOT be exposed in any API response.

#### Scenario: Duplicate id for the same owner is rejected

- GIVEN an existing ingredient or recipe with a given `id` for an owner
- WHEN that same owner attempts to create another record with the same `id`
- THEN the creation is rejected

#### Scenario: Internal identifier is never exposed

- GIVEN any successful API response containing an ingredient or recipe
- WHEN the response body is inspected
- THEN it contains the client-generated `id` and never the database-internal identifier
</content>
</invoke>
