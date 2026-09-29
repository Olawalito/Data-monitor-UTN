# Local MTN Data Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Datrack's mocked SIM table with a secure localhost-only monitor backed by MTN OAuth/Plans v2 and recoverable JSON storage.

**Architecture:** One Express process serves the compiled React app and API on `127.0.0.1`. Focused CommonJS modules own configuration/authentication, atomic JSON persistence, MTN access, and scheduled refreshes; the React app talks only to the local API.

**Tech Stack:** Node.js 18+, Express 5, Node `crypto`/`node:test`, Supertest, React 19, TypeScript, Vite, Vitest, Testing Library, JSON files.

**Spec:** `docs/superpowers/specs/2026-09-29-local-mtn-monitor-design.md`

## Global Constraints

- Bind to `127.0.0.1` by default; never silently fall back to `0.0.0.0`.
- Keep MTN credentials and password material server-side and out of Git, logs, responses, and test output.
- Maintain exactly two configured roles: `admin` and `reader`.
- Poll Plans v2; do not implement a webhook, employee registration, OTP, or purchase flow.
- Use Nigerian E.164 numbers and persist only approved SIMs plus normalized monitor fields.
- Retain last successful balance data on every upstream failure.
- Use test-first red/green cycles for every production behavior.

## Review Focus

- A malformed or duplicate MSISDN must return a validation error without changing disk state; cover in Task 2 API/store tests.
- A reader calling an admin endpoint directly must receive `403`, not merely lose the UI control; cover in Task 4 integration tests.
- Expired MTN tokens and concurrent refresh requests must reuse or replace tokens safely without duplicate same-SIM work; cover in Tasks 3 and 4.
- Corrupt primary JSON with a valid backup must recover; corrupt primary and backup must fail safely without overwriting either; cover in Task 2.
- An MTN timeout or unexpected payload must preserve cached values and surface `stale`/`error` without secrets or full reader MSISDNs; cover in Tasks 3–6.

---

### Task 1: Server Configuration and Local Authentication

**Files:**
- Modify: `server/package.json`
- Modify: `server/package-lock.json`
- Create: `server/src/config.js`
- Create: `server/src/auth.js`
- Create: `server/test/config.test.js`
- Create: `server/test/auth.test.js`
- Create: `server/.env.example`

**Interfaces:**
- Produces: `loadConfig(env) -> Config`, `hashPassword(password) -> Promise<string>`, `verifyPassword(password, encodedHash) -> Promise<boolean>`, and `createAuthService(config, options) -> { login, logout, getSession, requireRole }`.
- `Config` contains host, port, account names/hashes, session secret, MTN URLs/credentials, and refresh interval; error messages contain missing variable names only.

- [ ] **Step 1: Add failing configuration tests** for defaults, missing variable names, invalid host override, invalid interval, and absence of secret values in errors.
- [ ] **Step 2: Run `npm test -- config.test.js` in `server/`** and confirm failure because `src/config.js` does not exist.
- [ ] **Step 3: Implement `loadConfig`** with `HOST=127.0.0.1`, `PORT=3000`, and `REFRESH_INTERVAL_MINUTES=15` defaults while validating all required values.
- [ ] **Step 4: Run the configuration tests** and confirm they pass.
- [ ] **Step 5: Add failing authentication tests** for scrypt hashing, correct/incorrect password checks, random session creation, eight-hour idle expiry, logout, login throttling, and admin/reader authorization.
- [ ] **Step 6: Run `npm test -- auth.test.js`** and confirm failure because authentication is not implemented.
- [ ] **Step 7: Implement authentication** with Node `crypto.scrypt`, timing-safe comparison, opaque in-memory sessions, and process-local throttling; add `supertest` as a development dependency for later API tests.
- [ ] **Step 8: Run `npm test` in `server/`** and confirm all Task 1 tests pass without secret-bearing output.
- [ ] **Step 9: Commit** with `git commit -m "feat: add local configuration and role authentication"`.

### Task 2: Recoverable JSON SIM Store

**Files:**
- Create: `server/src/msisdn.js`
- Create: `server/src/sim-store.js`
- Create: `server/test/msisdn.test.js`
- Create: `server/test/sim-store.test.js`
- Create: `server/data/.gitkeep`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `normalizeNigerianMsisdn(input) -> string` and `createSimStore({ filePath, fsImpl? }) -> { init, list, add, remove, update }`.
- Store records use the exact version-1 fields in the spec; `add({label, msisdn})` creates a UUID and `pending` record.

- [ ] **Step 1: Add failing MSISDN tests** for `080...`, `234...`, `+234...`, whitespace, wrong country, wrong length, non-digits, and duplicates after normalization.
- [ ] **Step 2: Run `npm test -- msisdn.test.js`** and confirm the missing module causes the expected failure.
- [ ] **Step 3: Implement strict Nigerian normalization and label validation** in `src/msisdn.js`.
- [ ] **Step 4: Run the MSISDN tests** and confirm they pass.
- [ ] **Step 5: Add failing store tests** for first-run initialization, add/remove/update, serialized concurrent writes, complete-document validation, temporary-file cleanup, backup creation, primary recovery, and double-corruption failure.
- [ ] **Step 6: Run `npm test -- sim-store.test.js`** and confirm the store module is missing.
- [ ] **Step 7: Implement the queued atomic store** using same-directory temporary writes, file sync, backup preservation, and atomic rename; ignore `server/data/sims.json`, its backup, and temporary files.
- [ ] **Step 8: Run `npm test` in `server/`** and confirm all suites pass.
- [ ] **Step 9: Commit** with `git commit -m "feat: add recoverable SIM file storage"`.

### Task 3: MTN OAuth and Plans v2 Client

**Files:**
- Create: `server/src/mtn-client.js`
- Create: `server/test/mtn-client.test.js`

**Interfaces:**
- Produces: `createMtnClient({ fetchImpl, consumerKey, consumerSecret, tokenUrl, plansBaseUrl, clock?, timeoutMs? }) -> { getDataPlan }`.
- `getDataPlan(msisdn) -> Promise<{ balance: number, balanceUnit: string, expiresAt: string | null }>` sends `plan=DATA`, `idType=MSISDN`, and `segment=subscriber`.
- Throws classified errors with safe codes: `MTN_AUTH_FAILED`, `MTN_TIMEOUT`, `MTN_NOT_FOUND`, `MTN_BAD_RESPONSE`, or `MTN_UPSTREAM_FAILED`.

- [ ] **Step 1: Add failing client tests** for Basic/client-credentials authentication, token reuse, pre-expiry renewal, request URL/query construction, timeout, non-success status mapping, and representative valid/invalid Plans responses.
- [ ] **Step 2: Run `npm test -- mtn-client.test.js`** and confirm the missing module fails the tests.
- [ ] **Step 3: Implement the smallest injectable MTN client** with an in-memory token promise/cache, abort timeout, safe error classification, and response normalization without payload logging.
- [ ] **Step 4: Run `npm test -- mtn-client.test.js`** and confirm it passes.
- [ ] **Step 5: Run the complete server suite** and confirm it remains green.
- [ ] **Step 6: Commit** with `git commit -m "feat: add MTN plans client"`.

### Task 4: Refresh Service and Express API

**Files:**
- Create: `server/src/refresh-service.js`
- Create: `server/src/app.js`
- Replace: `server/server.js`
- Create: `server/test/refresh-service.test.js`
- Create: `server/test/app.test.js`

**Interfaces:**
- Produces: `createRefreshService({ store, mtnClient, clock?, intervalMs }) -> { refreshOne, refreshAll, start, stop }` with same-SIM refresh coalescing.
- Produces: `createApp({ config, auth, store, refreshService, staticDir? }) -> Express.Application` implementing the API envelopes and routes in the spec.
- `server.js` is composition only: load configuration, initialize dependencies, start the scheduler, bind the configured host, and handle shutdown.

- [ ] **Step 1: Add failing refresh tests** for successful normalization/persistence, sequential refresh-all, overlapping same-SIM calls, stale-data preservation, first-call error state, and safe error codes.
- [ ] **Step 2: Run `npm test -- refresh-service.test.js`** and confirm failure because the service is missing.
- [ ] **Step 3: Implement the refresh service** and keep scheduling injectable/disableable in tests.
- [ ] **Step 4: Run the refresh tests** and confirm they pass.
- [ ] **Step 5: Add failing Supertest API tests** for login/logout/session, cookie flags, masked reader results, admin CRUD/refresh, reader `403`s, unauthenticated `401`s, duplicate/malformed input, JSON-only mutations, same-origin enforcement, health, and consistent error envelopes.
- [ ] **Step 6: Run `npm test -- app.test.js`** and confirm the app factory is missing.
- [ ] **Step 7: Implement the Express app and composition entry point**, including JSON parsing, static production assets, SPA fallback, no-store API responses, and localhost binding.
- [ ] **Step 8: Run the complete server suite** and confirm it passes with no open handles or logged secrets.
- [ ] **Step 9: Commit** with `git commit -m "feat: expose authenticated SIM monitor API"`.

### Task 5: Frontend Authentication and API Boundary

**Files:**
- Modify: `datrack/package.json`
- Modify: `datrack/package-lock.json`
- Modify: `datrack/vite.config.ts`
- Create: `datrack/src/api/client.ts`
- Create: `datrack/src/types/api.ts`
- Create: `datrack/src/auth/AuthProvider.tsx`
- Create: `datrack/src/auth/ProtectedRoute.tsx`
- Replace: `datrack/src/pages/Login.tsx`
- Modify: `datrack/src/App.tsx`
- Create: `datrack/src/test/setup.ts`
- Create: `datrack/src/pages/Login.test.tsx`
- Create: `datrack/src/auth/ProtectedRoute.test.tsx`

**Interfaces:**
- Produces: typed `apiClient` methods for every backend route and `useAuth() -> { session, loading, login, logout }`.
- `ProtectedRoute` redirects unauthenticated users to `/` and authenticated users to `/dashboard` without role decisions in page components.

- [ ] **Step 1: Add Vitest, jsdom, and Testing Library configuration and failing tests** for login success/failure, session restoration, logout, protected redirect, and removal of sign-up/OTP controls.
- [ ] **Step 2: Run `npm test` in `datrack/`** and confirm tests fail because the API/auth boundary is absent.
- [ ] **Step 3: Implement typed fetch handling, auth context, route protection, and the simplified login page**; configure Vite's development `/api` proxy to `127.0.0.1:3000`.
- [ ] **Step 4: Run frontend tests** and confirm they pass.
- [ ] **Step 5: Run `npm run lint` and `npm run build` in `datrack/`** and fix only issues within touched code.
- [ ] **Step 6: Commit** with `git commit -m "feat: connect frontend authentication"`.

### Task 6: Role-aware Live Dashboard

**Files:**
- Replace: `datrack/src/types/SIMs.ts`
- Replace: `datrack/src/components/table.tsx`
- Modify: `datrack/src/pages/dashboard.tsx`
- Modify: `datrack/src/components/Header.tsx`
- Delete: `datrack/src/data/data.ts`
- Create: `datrack/src/components/SimTable.test.tsx`
- Create: `datrack/src/pages/dashboard.test.tsx`

**Interfaces:**
- Consumes: `apiClient`, `useAuth`, and the backend `SimRecord` shape from Task 5.
- Produces: a dashboard that renders loading, empty, fresh, stale, and error states; admin-only add/remove/refresh controls; and reader-only masked rows.

- [ ] **Step 1: Add failing component/page tests** for API-loaded rows, balance/expiry formatting, stale and error indicators, empty/loading states, admin controls/actions, reader control absence, and accessible confirmations for removal.
- [ ] **Step 2: Run the targeted frontend tests** and confirm they fail against the hard-coded table.
- [ ] **Step 3: Implement the live dashboard and role-aware controls** while preserving the current Datrack visual identity and using stable row keys.
- [ ] **Step 4: Run the complete frontend test suite** and confirm it passes.
- [ ] **Step 5: Run frontend lint and build** and confirm both pass.
- [ ] **Step 6: Commit** with `git commit -m "feat: add live role-aware MTN dashboard"`.

### Task 7: Secure Setup, Local Packaging, and End-to-End Verification

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `server/scripts/setup.js`
- Create: `server/scripts/live-smoke.js`
- Create: `server/test/setup.test.js`
- Create: `README.md`
- Modify: `datrack/README.md`

**Interfaces:**
- Produces: root `npm run setup`, `npm test`, `npm run build`, and `npm start` commands.
- `setup.js` prompts without echoing passwords/secrets, writes `server/.env` with mode `0600`, creates the empty version-1 store, and refuses to overwrite existing secrets without an explicit local confirmation.
- `live-smoke.js <msisdn>` performs one redacted OAuth/Plans check and exits nonzero on failure without printing credentials or the full MSISDN.

- [ ] **Step 1: Add failing setup tests** for hash-only password persistence, `.env` permissions, empty-store initialization, redacted output, and overwrite refusal.
- [ ] **Step 2: Run `npm test -- setup.test.js` in `server/`** and confirm failure because the setup module is absent.
- [ ] **Step 3: Implement setup and smoke scripts plus root orchestration scripts**; document installation, the two accounts, localhost boundary, backup recovery, start/stop, and credential renewal.
- [ ] **Step 4: Run `npm test` from the repository root** and confirm both server and frontend suites pass.
- [ ] **Step 5: Run `npm run build` from the root** and confirm the React production bundle succeeds.
- [ ] **Step 6: Run the built server with test-safe local configuration**, verify `GET /api/health`, login for both roles, reader `403`, admin CRUD, static SPA serving, and restart persistence.
- [ ] **Step 7: Use the MTN portal copy controls and `npm run setup` to place credentials into ignored `server/.env` without revealing them in output or Git status.**
- [ ] **Step 8: Run the opt-in live smoke test against one approved company MTN SIM if a number is supplied; otherwise report this single deferred verification explicitly.**
- [ ] **Step 9: Run `git status --short`, `git ls-files server/.env`, and a tracked-file secret-pattern scan** to prove credentials and runtime SIM data are untracked.
- [ ] **Step 10: Commit** with `git commit -m "chore: package secure local Datrack setup"`.

### Task 8: Final Verification and Review

**Files:**
- Modify only files required to fix issues found by verification or review.

**Interfaces:**
- Consumes: the complete application from Tasks 1–7.
- Produces: a clean branch whose documented commands reproduce the verified local system.

- [ ] **Step 1: Run the complete root test, lint, and build commands** and capture the passing summaries.
- [ ] **Step 2: Start the production build on `127.0.0.1`** and repeat the critical admin/reader/API/persistence smoke path.
- [ ] **Step 3: Inspect the final diff for secret exposure, unexpected tracked runtime files, unsafe bind addresses, full-number reader leakage, unhandled promise rejections, and unrelated edits.**
- [ ] **Step 4: Request a whole-branch code review and address only validated findings**, re-running affected tests after each fix.
- [ ] **Step 5: Run the complete verification suite again and record any external MTN limitation separately from local application correctness.**
- [ ] **Step 6: Commit any review fixes** with a focused message and leave the worktree clean.
