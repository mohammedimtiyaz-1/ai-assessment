# Release, Hardening, and Validation Plan

**Project**: AI Assessment MVP  
**Plan owner**: Coding agent  
**Created**: 2026-05-24  
**Status**: In progress - core release gates implemented  
**Primary goal**: Convert the implemented MVP into a releasable production candidate by closing test, quality, security, migration, deployment, and monitoring gaps.

## Implementation Update

Completed in the first hardening pass:

- Added `typecheck` and `test:coverage` scripts.
- Fixed Vitest scope so unit tests do not execute Playwright specs.
- Added the Vitest V8 coverage provider.
- Made lint, typecheck, unit tests, coverage, and build pass locally.
- Added Playwright `webServer` startup.
- Expanded CI to run lint, typecheck, migrations, tests, coverage, build, and conditional E2E.
- Added deployment, operations, security review, and risk-register docs.
- Disabled `/api/debug/auth` in production.

Still open:

- Resolve `pnpm audit` findings before public production release.
- Create deterministic Supabase-backed E2E test data.
- Run migrations against a disposable database or staging database.
- Continue replacing debug logging and loose typing in application routes.

## 0. Current Baseline

This repo already has the main product flows implemented and has basic release material in place:

- App stack: Next.js 14 App Router, React 18, TypeScript, Tailwind, NextAuth, PostgreSQL, `node-pg-migrate`, Vitest, Playwright.
- Unit test entry point: `pnpm test`.
- E2E test entry point: `pnpm test:e2e`.
- Build entry point: `pnpm build`.
- Lint entry point: `pnpm lint`.
- Migration entry points: `pnpm migrate:up`, `pnpm migrate:down`, `pnpm migrate:reset`.
- Existing documents: `RELEASE_CHECKLIST.md`, `docs/qa-test-plan.md`, `database-setup-and-seeding.md`.
- Existing CI currently installs dependencies, builds, and runs unit tests.

Known gaps to handle during this phase:

- No package script currently exists for `tsc --noEmit`; TypeScript checking must be added or documented as `pnpm exec tsc --noEmit`.
- CI does not currently run lint, TypeScript checks, migrations, or Playwright E2E tests.
- Playwright config does not start the app through `webServer`; E2E requires a manually running app.
- E2E test artifacts in `playwright-report/` and `test-results/` indicate recent failures or stale generated output. Do not treat generated artifacts as source.
- Some API routes still contain `console.log` debug output and loose `any` typing. These should be hardened before release.
- Production deployment, rollback, monitoring, and alerting are not yet fully specified.

## 1. Execution Rules for the Agent

1. Work in small commits or reviewable patches grouped by phase.
2. Preserve user changes and generated artifacts unless explicitly asked to clean them.
3. Before editing a file, inspect the surrounding code and follow existing patterns.
4. Prefer adding automated checks over relying only on manual QA.
5. Every phase must end with a clear pass/fail note and commands run.
6. If a command fails because environment variables, database access, or external services are missing, document the blocker and add a reproducible command for the owner to rerun.

## 2. Phase A - Release Readiness Triage

### Goal
Establish the real current state before hardening. The output is a prioritized defect list and an updated execution order.

### Steps
1. Inspect repo status:
   ```bash
   git status --short
   ```
2. Identify generated files that should not be edited manually:
   - `playwright-report/**`
   - `test-results/**`
   - coverage output, if present
3. Review currently available scripts:
   ```bash
   pnpm run
   ```
4. Run static inventory searches:
   ```bash
   rg -n "TODO|FIXME|console\.log|ts-ignore|eslint-disable|test\.only|describe\.only|it\.only|test\.skip|describe\.skip|it\.skip" src tests scripts migrations
   rg -n "process\.env|DATABASE_URL|NEXTAUTH|OPENAI|SUPABASE|RESEND|SECRET|TOKEN|KEY" src scripts .env.example README.md
   ```
5. Compare `RELEASE_CHECKLIST.md` with the actual repo state and mark each item as:
   - `done`
   - `needs work`
   - `blocked`
   - `not applicable for MVP`
6. Create or update a short release issue list in this document or a separate `docs/release-risk-register.md`.

### Deliverables
- Current-state summary.
- Prioritized hardening backlog.
- List of commands that pass, fail, or are blocked.

### Exit Criteria
- The agent knows which failures are product bugs, which are environment gaps, and which are generated artifact noise.

## 3. Phase B - Unit and Integration Test Hardening

### Goal
Make unit and API-level tests reliable enough to catch regressions in auth, AI generation, validation, session scoring, and data access.

### Steps
1. Run the current test suite:
   ```bash
   pnpm test
   ```
2. Add a coverage script to `package.json`:
   ```json
   "test:coverage": "vitest run --coverage"
   ```
3. Run coverage:
   ```bash
   pnpm test:coverage
   ```
4. Add or strengthen tests for these high-risk modules:
   - `src/lib/env.ts`: required/optional environment validation.
   - `src/lib/auth.ts`: credential failure, password verification, role injection.
   - `src/lib/password-validation.ts`: weak and valid password cases.
   - `src/lib/rate-limit.ts`: limit reached and retry-after behavior.
   - `src/lib/ai.ts`: missing API key, malformed model output, unsupported question type, retry/error paths.
   - `src/lib/content-extraction.ts`: text extraction fallback and unsupported file types.
   - API route helpers: unauthorized, wrong role, validation failure, success response.
5. Add tests for server-authoritative quiz behavior:
   - Session cannot be submitted by the wrong user.
   - Duplicate answers are handled consistently.
   - Score calculation uses server-side correct answers.
   - Finished sessions cannot be mutated unexpectedly.
6. Mock external services:
   - OpenAI calls.
   - Email provider calls, if enabled.
   - Database queries where route-level unit tests do not need a real DB.
7. Set a realistic coverage gate:
   - Minimum MVP target: 70% statements/branches/functions/lines for `src/lib/**` and critical route helpers.
   - Do not force coverage on UI primitives or generated framework files.

### Deliverables
- Passing `pnpm test`.
- Passing `pnpm test:coverage`.
- Coverage thresholds configured or documented.
- Tests for critical auth, AI, quiz, and validation paths.

### Exit Criteria
- A broken auth, scoring, environment, or AI-generation path fails CI before release.

## 4. Phase C - End-to-End Test Stabilization

### Goal
Make Playwright represent the real user journeys and run reproducibly in local and CI environments.

### Steps
1. Inspect all Playwright specs in `tests/`.
2. Confirm each test has deterministic data setup. Avoid relying on previous local state.
3. Add a test database setup strategy:
   - Preferred: dedicated test database.
   - Run migrations before E2E.
   - Run deterministic seed before E2E.
   - Clean test-created rows between tests or use unique emails/tokens.
4. Update `playwright.config.ts` with `webServer` so tests can start the app automatically:
   ```ts
   webServer: {
     command: "pnpm dev",
     url: "http://localhost:3000",
     reuseExistingServer: !process.env.CI,
     timeout: 120_000,
   }
   ```
5. Add or verify E2E coverage for the critical flows:
   - Landing page and public navigation.
   - Signup and login.
   - Student dashboard.
   - Student content upload.
   - Student content library.
   - Student quiz start.
   - Quiz runtime submit and results.
   - Teacher dashboard.
   - Teacher assessment create, publish, link creation.
   - Public link resolve and start.
   - Role-based route protection.
6. Add negative-path E2E tests:
   - Student cannot access teacher pages.
   - Teacher cannot see student-owned private data.
   - Expired or inactive public link is rejected.
   - Missing access code is rejected.
   - Invalid quiz session returns an appropriate state.
7. Run E2E locally:
   ```bash
   pnpm test:e2e
   ```
8. If tests fail, fix product or test setup issues. Do not commit generated failure screenshots unless the repo intentionally tracks them.

### Deliverables
- Stable Playwright config.
- Deterministic E2E setup.
- Passing `pnpm test:e2e` locally.
- CI-ready E2E command.

### Exit Criteria
- A fresh clone with correct environment variables can run E2E tests without manual browser setup.

## 5. Phase D - TypeScript Check

### Goal
Make TypeScript correctness explicit and enforce it in CI.

### Steps
1. Add a typecheck script:
   ```json
   "typecheck": "tsc --noEmit"
   ```
2. Run:
   ```bash
   pnpm typecheck
   ```
3. Fix surfaced errors without weakening `strict`.
4. Reduce high-risk `any` usage first:
   - NextAuth callback params in `src/lib/auth.ts`.
   - Playwright helper params in `tests/*.spec.ts`.
   - API rows that are later used as trusted domain data.
5. Add local route/domain types where they improve safety:
   - User roles.
   - Assessment status.
   - Quiz session status.
   - Question answer payloads.
6. Keep `skipLibCheck` unless library typing noise blocks release. Do not relax app code checks.

### Deliverables
- `pnpm typecheck` script.
- Passing typecheck.
- Reduced `any` in critical auth/API/test helper paths.

### Exit Criteria
- CI can fail on TypeScript regressions independent of `next build`.

## 6. Phase E - Lint and Code Quality

### Goal
Remove release-blocking code quality issues and make lint run reliably locally and in CI.

### Steps
1. Run:
   ```bash
   pnpm lint
   ```
2. If `next lint` is incompatible with the installed ESLint version or Next.js version, migrate to an explicit ESLint config and script compatible with the repo.
3. Replace debug `console.log` output in server routes with `src/lib/logger.ts`.
4. Keep `console.error` only where intentionally used for client error boundaries or startup failure reporting.
5. Remove stale `eslint-disable` comments unless they are justified.
6. Confirm there are no focused or skipped tests:
   ```bash
   rg -n "test\.only|describe\.only|it\.only|test\.skip|describe\.skip|it\.skip" tests src
   ```
7. Add lint to CI.

### Deliverables
- Passing `pnpm lint`.
- Debug logs removed or converted to structured logger calls.
- Lint runs in CI.

### Exit Criteria
- Lint failure blocks merges and release candidates.

## 7. Phase F - Security Review and Hardening

### Goal
Close security risks in auth, authorization, secrets, public links, uploads, database access, and logging.

### Steps
1. Run dependency audit:
   ```bash
   pnpm audit
   ```
2. Review secrets handling:
   - `.env.example` documents required variables without real values.
   - `.env.local` is ignored and not committed.
   - Logs never print `DATABASE_URL`, API keys, passwords, access codes, or session tokens.
3. Review auth and RBAC:
   - All protected API routes use a shared auth guard.
   - Role checks happen server-side.
   - Student and teacher data is scoped by owner or permitted role.
   - Debug auth route is removed, disabled, or restricted outside development.
4. Review public assessment links:
   - Tokens are non-guessable.
   - Expired/inactive links cannot start sessions.
   - Access codes are hashed and compared safely.
   - `requireLogin` is enforced server-side.
5. Review input validation:
   - All mutating API routes validate request bodies with `zod` or equivalent.
   - IDs and tokens are validated before database queries.
   - File upload accepts only supported types and reasonable sizes.
6. Review SQL safety:
   - All queries are parameterized.
   - No string interpolation into SQL with user-controlled values.
   - Row-level ownership conditions are present on read/update/delete queries.
7. Review rate limiting:
   - Auth/register endpoints are limited.
   - Public-link start endpoint is limited.
   - AI generation endpoint is limited.
   - For production, replace in-memory limiting with Redis or provider-level protection if running multiple instances.
8. Review browser security:
   - Set secure cookies in production.
   - Confirm NextAuth production URL and secret.
   - Add security headers where appropriate: CSP, frame options, referrer policy, content type options.
9. Review logging and PII:
   - User IDs are acceptable in logs.
   - Emails, answers, uploaded text, and generated content should be logged sparingly or redacted.

### Deliverables
- Security review notes.
- Fixed high and medium severity issues.
- Documented accepted risks for MVP.
- Passing `pnpm audit` or documented exceptions with mitigation.

### Exit Criteria
- No known high severity dependency, auth, RBAC, secret, SQL injection, or public-link issue remains open.

## 8. Phase G - Database Migrations and Data Validation

### Goal
Ensure migrations are safe, reversible where practical, and production-ready.

### Steps
1. Inspect all files in `migrations/` for:
   - Idempotent extension creation.
   - Backward-compatible schema additions.
   - No destructive changes without backup and rollback notes.
   - Correct indexes and foreign keys.
2. Test migrations on a clean database:
   ```bash
   pnpm migrate:up
   ```
3. Test rollback on a non-production database:
   ```bash
   pnpm migrate:down
   pnpm migrate:up
   ```
4. Test development seed:
   ```bash
   pnpm run seed:development
   ```
5. Add migration smoke tests to CI using a PostgreSQL service:
   - Start PostgreSQL.
   - Set `DATABASE_URL`.
   - Run `pnpm migrate:up`.
   - Optionally run seed script in a dedicated test database.
6. Validate required production indexes:
   - Users by email.
   - Assessment links by token.
   - Content by owner.
   - Sessions by user/assessment.
   - Answers by session/question.
7. Add production migration procedure:
   - Take backup.
   - Run migration.
   - Verify `/api/health`.
   - Run smoke tests.
   - Roll back application if migration fails.
   - Roll back database only when the migration is explicitly reversible and safe.

### Deliverables
- Clean database migration proof.
- Rollback proof or explicit no-rollback note per risky migration.
- CI migration job.
- Production migration runbook.

### Exit Criteria
- A fresh production database can be created from migrations alone, without manual schema edits.

## 9. Phase H - Deployment Setup

### Goal
Make the app deployable to a production environment with repeatable build, migration, and rollback steps.

### Steps
1. Choose and document target hosting. If not already chosen, use one of:
   - Vercel for Next.js app plus managed PostgreSQL.
   - Render/Fly/Railway for app plus managed PostgreSQL.
   - Container platform with a Node 20 runtime.
2. Document required production environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `OPENAI_API_KEY`
   - `LOG_LEVEL`
   - Optional provider variables such as email, object storage, or Supabase if used.
3. Add or verify production build:
   ```bash
   pnpm build
   ```
4. Add a deployment guide at `docs/deployment.md` covering:
   - Environment setup.
   - Database creation.
   - Migration command.
   - Build command.
   - Start command.
   - Smoke tests.
   - Rollback.
5. Add a smoke test checklist:
   - `/api/health` returns 200.
   - Login works.
   - Student dashboard loads.
   - Teacher dashboard loads.
   - Public assessment link resolves.
   - One quiz can be started and submitted.
6. Add CI release gates:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   pnpm test:e2e
   ```
7. Add artifact handling:
   - Upload Playwright report on CI failure.
   - Do not commit generated test reports.
8. Define rollback:
   - Revert app deployment to previous version.
   - Keep migrations backward compatible whenever possible.
   - If database rollback is needed, use tested `migrate:down` only on a backed-up database.

### Deliverables
- `docs/deployment.md`.
- CI workflow with all release gates.
- Production env var checklist.
- Rollback runbook.

### Exit Criteria
- A new environment can be deployed by following docs without undocumented manual steps.

## 10. Phase I - Production Monitoring and Operations

### Goal
Make production failures visible quickly and provide enough context to debug without exposing sensitive data.

### Steps
1. Confirm health endpoint behavior:
   - `GET /api/health` returns status, timestamp, and optionally database connectivity.
   - Health output must not include secrets.
2. Add structured application logs:
   - Request errors.
   - Auth failures without sensitive values.
   - AI generation failures.
   - Public-link start failures.
   - Quiz submit failures.
3. Add error tracking:
   - Sentry or equivalent for server and client errors.
   - Source maps configured only according to the provider's secure setup.
4. Add uptime monitoring:
   - Monitor `/api/health` every 1-5 minutes.
   - Alert on repeated failures.
5. Add API performance monitoring:
   - Track p50/p95 latency for critical endpoints.
   - Track 4xx and 5xx rates.
   - Track slow database queries.
6. Add product-critical metrics:
   - Signup success/failure.
   - Login success/failure.
   - Content upload success/failure.
   - AI question generation success/failure.
   - Quiz start/submit success/failure.
   - Public-link resolve/start success/failure.
7. Add database monitoring:
   - Connection count.
   - CPU/memory/storage.
   - Slow queries.
   - Backup status.
8. Add alert routing:
   - Critical: app down, database unavailable, auth broken, migrations failed.
   - High: elevated 5xx, OpenAI failures, quiz submit failures.
   - Medium: slow endpoints, elevated validation errors.
9. Add operational docs:
   - Incident checklist.
   - Backup restore checklist.
   - How to inspect logs.
   - How to replay smoke tests.

### Deliverables
- Monitoring provider configured.
- Alert destinations configured.
- Operational runbook in `docs/operations.md`.
- Health check and smoke checks documented.

### Exit Criteria
- The team gets an alert for app downtime or high error rates and has a documented first response path.

## 11. Phase J - Final Release Candidate Validation

### Goal
Produce a release candidate that is validated end to end and ready for sign-off.

### Steps
1. Start from a clean branch or clearly documented worktree state.
2. Run full local gate:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm test:coverage
   pnpm build
   pnpm test:e2e
   ```
3. Run migration validation on a clean database.
4. Deploy to staging.
5. Run staging smoke tests.
6. Run manual QA from `docs/qa-test-plan.md` for critical and high priority flows.
7. Complete `RELEASE_CHECKLIST.md`.
8. Record release notes:
   - Version or commit SHA.
   - Known limitations.
   - Environment changes.
   - Migration changes.
   - Rollback notes.
9. Get sign-off:
   - Engineering.
   - QA/reviewer.
   - Product owner.

### Deliverables
- Passing local and CI gates.
- Staging deployment proof.
- Completed release checklist.
- Release notes.

### Exit Criteria
- The release candidate has no open critical or high severity issues and can be promoted to production.

## 12. Recommended Execution Order

1. Phase A - Release readiness triage.
2. Phase D - TypeScript check script and failures.
3. Phase E - Lint reliability and debug log cleanup.
4. Phase B - Unit/integration tests and coverage.
5. Phase G - Migration validation.
6. Phase C - E2E stabilization.
7. Phase F - Security review and hardening.
8. Phase H - Deployment setup.
9. Phase I - Production monitoring.
10. Phase J - Final release candidate validation.

This order front-loads fast static feedback, then validates data safety, then stabilizes browser flows, then closes deployment and operations.

## 13. Definition of Done

Release, hardening, and validation is complete when:

- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm test` passes.
- `pnpm test:coverage` passes or coverage exceptions are documented.
- `pnpm build` passes.
- `pnpm test:e2e` passes against a deterministic test database.
- Migrations apply cleanly from an empty database.
- Production deployment steps are documented and tested in staging.
- Security review has no unresolved critical/high issues.
- Monitoring and alerting are configured for health, errors, latency, and database status.
- `RELEASE_CHECKLIST.md` is completed and signed off.

## 14. First Task for the Next Coding Agent

Start with this exact sequence:

```bash
git status --short
pnpm run
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Then update the plan with actual results before making broad changes. If `pnpm lint` or `pnpm exec tsc --noEmit` fails because scripts/configuration are missing or incompatible, fix those first and add stable `lint` and `typecheck` release gates to `package.json` and CI.
