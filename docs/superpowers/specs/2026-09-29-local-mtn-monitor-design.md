# Local MTN Data Monitor Design

## Purpose

Datrack is a single-computer internal tool for Unified TrustNet's IT staff. It monitors approved company MTN Nigeria SIMs, showing current data balance, bundle expiry, refresh status, and the last successful update. It is not a public service and must only accept connections from the computer on which it is installed.

## Goals

- Replace the frontend's hard-coded SIM data with live data from MTN Plans v2.
- Let an administrator preload and maintain the approved company SIM list.
- Provide one administrator account and one read-only account.
- Keep MTN credentials and account password material exclusively on the server.
- Remain simple to install, operate, back up, and recover without a database server.
- Preserve the last known balance when MTN is temporarily unavailable.

## Non-goals

- Employee self-registration, OTP enrolment, or per-employee accounts.
- Public, LAN, cloud, or remote access.
- MTN webhooks; Plans v2 will be polled.
- Multi-process or multi-host operation.
- Purchasing, gifting, or transferring data.
- Production-scale identity management or audit reporting.

## Runtime Architecture

One Node.js/Express process binds to `127.0.0.1` and serves both the compiled React application and the JSON API. The React application never contacts MTN directly. The Express server owns authentication, authorization, file persistence, token management, polling, response normalization, and error handling.

The server has four focused modules:

1. **Authentication** validates the two configured accounts and manages in-memory sessions.
2. **SIM store** validates records and performs serialized, atomic JSON updates with backup recovery.
3. **MTN client** obtains OAuth tokens and retrieves Plans v2 data for an approved MSISDN.
4. **Refresh service** updates cached SIM results manually or on a 15-minute schedule.

The existing callback endpoint is removed because this workflow does not use three-legged OAuth or a balance-change webhook.

## Configuration and Secrets

`server/.env` is local-only and ignored by Git. `server/.env.example` documents required names without values:

- `HOST=127.0.0.1`
- `PORT=3000`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `READER_USERNAME`
- `READER_PASSWORD_HASH`
- `SESSION_SECRET`
- `MTN_CONSUMER_KEY`
- `MTN_CONSUMER_SECRET`
- `MTN_TOKEN_URL`
- `MTN_PLANS_BASE_URL`
- `REFRESH_INTERVAL_MINUTES=15`

Passwords are hashed with Node's built-in `scrypt`; plaintext passwords are never stored. A setup command prompts locally for the two passwords and writes only their hashes. MTN credentials are copied from the developer portal into `server/.env` without printing them to logs or committing them.

The application fails fast at startup with a list of missing configuration names, but never includes secret values in an error.

## Authentication and Authorization

- The login form accepts username and password.
- Successful login creates a cryptographically random server-side session with an eight-hour idle lifetime.
- The browser receives only an `HttpOnly`, `SameSite=Strict` session cookie.
- Sessions exist in memory, so restarting the server signs out both accounts.
- Login attempts are rate-limited per process to reduce password guessing.
- Every mutation requires the `admin` role.
- The `reader` role can only view health and SIM data.
- Reader responses mask MSISDNs except for the final four digits; admin responses include the complete normalized number.
- State-changing requests require JSON content type and a same-origin `Origin` header when the header is present.

Because the service binds only to `127.0.0.1`, it is unreachable from other computers even when the host joins an untrusted network. The deployment documentation must warn operators not to change the host to `0.0.0.0`.

## SIM Data and Persistence

The canonical file is `server/data/sims.json`. It has a versioned envelope and one record per approved number:

```json
{
  "version": 1,
  "sims": [
    {
      "id": "generated-uuid",
      "label": "Sales Router",
      "msisdn": "+2348012345678",
      "balance": null,
      "balanceUnit": null,
      "expiresAt": null,
      "lastAttemptAt": null,
      "lastSuccessAt": null,
      "status": "pending",
      "errorCode": null
    }
  ]
}
```

Numbers are normalized to Nigerian E.164 format and must begin with `+234` followed by ten digits. Duplicate numbers are rejected. Labels are required, trimmed, and limited to 80 characters.

All writes pass through one in-process queue. A write validates the complete next document, writes and syncs a temporary file in the same directory, preserves the previous valid file as `sims.json.bak`, and atomically renames the temporary file over the canonical file. On startup, an invalid or unreadable canonical file is replaced from the validated backup. Startup fails with a clear recovery message if neither file is valid.

## MTN Integration

The server uses the application's consumer key and secret to request an OAuth access token. It caches the token in memory until shortly before expiry and requests a replacement only when required. Tokens and credentials are never persisted in the SIM file or returned through the API.

For each approved number, the server calls Plans v2 with:

- `customerId`: normalized MSISDN without guesswork or alternate identifiers
- `plan=DATA`
- `idType=MSISDN`
- `segment=subscriber`

The MTN client converts a successful response into the normalized balance and expiry fields used by Datrack. The original MTN payload is not stored because it may contain unnecessary subscriber information.

Refreshes run sequentially to keep load and rate-limit behavior predictable. The scheduler starts after configuration and data validation, then runs every 15 minutes while the process is active. Administrators can trigger a refresh of one SIM or all SIMs. Overlapping refreshes for the same SIM are coalesced rather than duplicated.

## Failure Behaviour

- An MTN authentication failure marks the current attempt failed but retains every last successful balance.
- A per-SIM error changes that SIM's `status` to `stale` or `error`, records a non-sensitive error code, and preserves its prior data.
- `stale` means usable cached data exists; `error` means no successful data has ever been obtained.
- A timeout prevents one MTN request from blocking the full refresh indefinitely.
- Invalid MTN payloads are treated as upstream errors and are never written as successful zero balances.
- UI errors use concise operator-facing messages and never include credentials, tokens, stack traces, or full reader-visible phone numbers.
- Server logs redact MSISDNs to their final four digits and never log authorization headers or MTN response bodies.

## HTTP API

- `POST /api/auth/login` — authenticate either configured account.
- `POST /api/auth/logout` — invalidate the current session.
- `GET /api/auth/session` — return the current role and username.
- `GET /api/health` — report local service readiness without exposing secrets.
- `GET /api/sims` — return role-appropriate SIM rows.
- `POST /api/sims` — admin-only creation of a validated SIM.
- `DELETE /api/sims/:id` — admin-only removal.
- `POST /api/sims/:id/refresh` — admin-only single refresh.
- `POST /api/sims/refresh` — admin-only refresh of all approved SIMs.

All responses use a consistent `{ "data": ... }` success envelope or `{ "error": { "code": "...", "message": "..." } }` failure envelope.

## Frontend Behaviour

The existing visual style remains. The fake sign-up and OTP flows are removed because accounts are locally configured. Login uses the backend session endpoint.

The dashboard displays label, role-appropriate phone number, data balance, expiry date, last successful refresh, and status. The administrator also sees add, remove, refresh-one, and refresh-all controls. The reader sees no mutation controls. Loading, empty, stale, error, and unauthorized states have explicit UI treatments.

## Testing and Verification

- Server unit tests cover number normalization, role checks, password verification, response normalization, token caching, and JSON validation.
- Store tests use temporary directories to prove atomic updates, serialized writes, backup creation, and backup recovery.
- API integration tests use a fake MTN transport and temporary data files; they never call MTN or require real credentials.
- Frontend tests cover login, role-specific controls, masked reader data, loading, and stale/error rendering.
- A production build and lint run must pass.
- One opt-in live smoke command, never part of the automated suite, tests OAuth and Plans v2 against one administrator-supplied approved SIM without printing secrets or the complete number.

## Acceptance Criteria

1. The service listens only on `127.0.0.1` by default and serves the application from one local URL.
2. Neither account can authenticate with an incorrect password; the reader cannot mutate data through either the UI or direct API calls.
3. The administrator can add a valid Nigerian MTN number, cannot add a duplicate or malformed number, and can remove an existing number.
4. A refresh obtains and displays normalized Plans v2 balance and expiry data when MTN grants access.
5. MTN failure preserves the last successful values and visibly marks them stale.
6. Restarting the application retains SIM data but clears sessions and OAuth tokens.
7. A simulated interrupted or corrupt canonical JSON file recovers from the last valid backup.
8. Repository history, logs, frontend bundles, API responses, and automated-test output contain no MTN credentials or plaintext account passwords.

## Operational Boundary

This design reduces risk for a single-computer internal tool; it does not make the application safe to expose to a LAN or the public internet. If remote or multi-computer access becomes necessary, the deployment and authentication model must be redesigned before changing the bind address.
