# User Auth Specification

## Purpose

JWT-based authentication so a user can optionally create an account, without an account ever being required for local-only use.

## Requirements

### Requirement: Account Signup

The system MUST allow creating an account from an email and a password, MUST reject a syntactically invalid email, MUST reject a password shorter than 8 characters, and MUST reject signup when the email is already registered, without creating a duplicate account.

#### Scenario: Successful signup

- GIVEN an email not yet registered and a password of at least 8 characters
- WHEN the client submits a signup request
- THEN an account is created, the password is stored hashed (never in plaintext), and a session is established

#### Scenario: Invalid email rejected

- GIVEN a syntactically invalid email
- WHEN the client submits a signup request
- THEN the request is rejected and no account is created

#### Scenario: Password too short rejected

- GIVEN a valid email and a password shorter than 8 characters
- WHEN the client submits a signup request
- THEN the request is rejected and no account is created

#### Scenario: Duplicate email rejected

- GIVEN an email already registered to an existing account
- WHEN the client submits a signup request with that email
- THEN the request is rejected, no new account is created, and no existing account is modified

### Requirement: Login

The system MUST authenticate an email/password pair and issue a JWT on success. It MUST reject incorrect credentials with a generic error that does not reveal whether the email exists.

#### Scenario: Successful login

- GIVEN a registered account with a known password
- WHEN the client submits matching credentials
- THEN a valid JWT is issued and the response identifies the authenticated user

#### Scenario: Wrong password rejected

- GIVEN a registered account
- WHEN the client submits that email with an incorrect password
- THEN the request is rejected with a generic invalid-credentials error and no JWT is issued

#### Scenario: Unknown email rejected

- GIVEN an email with no matching account
- WHEN the client submits a login request with that email
- THEN the request is rejected with the same generic invalid-credentials error used for a wrong password, and no JWT is issued

### Requirement: Session Verification

Every protected endpoint MUST require a valid, non-expired JWT bearer token. Requests with a missing, malformed/invalid-signature, or expired token MUST be rejected before any protected logic runs.

#### Scenario: Missing token rejected

- GIVEN a request to a protected endpoint with no Authorization header
- WHEN the request is processed
- THEN it is rejected and no protected data is returned

#### Scenario: Invalid token rejected

- GIVEN a request bearing a malformed token or one with an invalid signature
- WHEN the request is processed
- THEN it is rejected and no protected data is returned

#### Scenario: Expired token rejected

- GIVEN a request bearing a syntactically valid JWT past its expiration time
- WHEN the request is processed
- THEN it is rejected and no protected data is returned

#### Scenario: Valid token resolves identity

- GIVEN a request bearing a valid, non-expired JWT
- WHEN the request is processed
- THEN the request proceeds with the authenticated user's identity attached

### Requirement: Rate Limiting on Auth Routes

Signup and login endpoints MUST be rate-limited per origin/client to mitigate brute-force and credential-stuffing attempts.

#### Scenario: Rate limit exceeded

- GIVEN a client that has exceeded the allowed number of signup or login attempts in the configured window
- WHEN it sends another signup or login request
- THEN the request is rejected without attempting authentication, and no account state changes

### Requirement: Password Storage

Passwords MUST be hashed (bcrypt) before persistence. Plaintext passwords MUST NOT be stored or logged anywhere.

#### Scenario: Stored password is never plaintext

- GIVEN a completed signup
- WHEN the stored account record is inspected
- THEN the password field contains only a hash, never the original plaintext value
</content>
</invoke>
