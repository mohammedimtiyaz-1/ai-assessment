# QA Remediation Plan

**Source report:** `docs/qa-report.md`  
**Created:** 2026-05-26  
**Purpose:** Senior engineering remediation plan for every QA finding, with root cause, permanent fix, implementation notes, verification, and acceptance criteria.

## Executive Summary

The QA report identifies five actionable defects and one resolved validation finding:

| ID | Severity | Finding | Recommended Action |
| --- | --- | --- | --- |
| QA-1 | Critical | Registration fails with Supabase RLS policy violation | Fix admin Supabase client and production env contract |
| QA-2 | Medium | `/teacher/dashboard` returns 404 | Add canonical teacher dashboard route or redirect |
| QA-3 | Resolved | Assessment creation validation works | Preserve with regression tests |
| QA-4 | Low | Teacher pages show student navigation when unauthenticated/no session | Make teacher layout route-aware, not only session-aware |
| QA-5 | Critical | `/student/progress` crashes on unauthenticated/error response | Normalize API response handling and fail closed |
| QA-6 | Medium | `/teacher/content` returns 404 | Add teacher content page backed by existing API |

The most important architectural theme: several UI pages assume successful JSON data contracts even when APIs return `{ error: ... }`. The durable fix is to make API clients handle non-OK responses explicitly and normalize data before render.

## Current Code Observations

- `src/lib/db.ts` exports both `supabase` and `supabaseAdmin`, but `supabaseAdmin` currently falls back to the anon key when `SUPABASE_SERVICE_ROLE_KEY` is absent. This makes admin writes silently run under RLS and fail later.
- `src/app/api/auth/register/route.ts` correctly intends to use `supabaseAdmin`, but it cannot bypass RLS if the service role key is absent.
- Teacher dashboard functionality exists at `/dashboard` in `src/app/dashboard/page.tsx`, but QA and homepage expect `/teacher/dashboard`.
- Homepage links `I'm a Teacher` to `/teacher/dashboard`, which currently has no page.
- `src/components/layout/shell.tsx` chooses teacher vs student navigation from `session.user.role`. During unauthenticated QA of teacher routes, no role exists, so the shell defaults to student navigation.
- `src/app/student/progress/page.tsx` calls `fetch("/api/student/progress").then(r => r.json()).then(setData)` without checking `r.ok`. On `401`, it stores `{ error: "Unauthorized" }` as progress data, then reads `data.weakAreas.length`, causing the crash.
- `src/app/api/teacher/content/route.ts` exists, but `src/app/teacher/content/page.tsx` does not.

## QA-1: Registration API RLS Policy Violation

### Reported Behavior

`POST /api/auth/register` returns `500` with:

```text
new row violates row-level security policy for table "users"
```

### Root Cause

The registration route uses `supabaseAdmin`, but `supabaseAdmin` is not guaranteed to be an admin client. In `src/lib/db.ts`, it currently uses:

```ts
const adminKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```

When `SUPABASE_SERVICE_ROLE_KEY` is absent or empty, `supabaseAdmin` becomes an anon client. That is dangerous because:

- the code still reads as if it has elevated permission;
- inserts into `users` hit RLS;
- the failure happens at runtime instead of startup/config validation;
- production may appear healthy until the first registration attempt.

### Permanent Fix

Do not let `supabaseAdmin` silently fall back to anon credentials. Make elevated operations fail clearly when service role credentials are missing.

Recommended implementation:

1. Split Supabase clients by privilege:
   - `supabase`: anon client for normal RLS-respecting operations.
   - `getSupabaseAdmin()`: lazy factory that requires `SUPABASE_SERVICE_ROLE_KEY`.
2. In `getSupabaseAdmin()`, throw a typed configuration error when the service key is missing.
3. In `POST /api/auth/register`, catch that configuration error and return `503` with a safe message:
   - user-facing: `"Registration is temporarily unavailable"`
   - logs: include `"SUPABASE_SERVICE_ROLE_KEY missing"` without printing secrets.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it with `NEXT_PUBLIC_`.
5. Configure `SUPABASE_SERVICE_ROLE_KEY` in:
   - `.env.local`
   - Vercel Production
   - Vercel Preview, if preview registration should work
   - CI only if integration tests require it
6. Decide whether direct insert into `users` is the long-term auth model. If Supabase Auth is not used, a server-side service-role insert is acceptable, but it must be isolated and audited.

### Files To Change

- `src/lib/db.ts`
- `src/app/api/auth/register/route.ts`
- `.env.example`
- `docs/deployment.md`
- tests for registration route or Supabase client factory

### Test Plan

Automated:

- Unit test `getSupabaseAdmin()`:
  - returns admin client when service key exists;
  - throws config error when missing.
- API route test:
  - missing service role returns `503`;
  - duplicate email returns `400`;
  - valid registration returns `201` when admin insert succeeds.

Manual:

```bash
curl -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"qa-student@example.com","password":"Test123!","name":"QA Student","role":"student"}'
```

Expected: `201` with `userId`, then signup UI auto-login succeeds.

### Acceptance Criteria

- Registration succeeds locally and in production when service role is configured.
- Registration returns a clear non-500 configuration response when service role is missing.
- Logs never print the service role key.
- RLS violation no longer appears for normal registration.

## QA-2: Teacher Dashboard Page Missing

### Reported Behavior

`GET /teacher/dashboard` returns `404`.

### Root Cause

The teacher dashboard exists at `/dashboard`, while the homepage and QA expect `/teacher/dashboard`. This is a route contract mismatch:

- `src/app/dashboard/page.tsx` implements the teacher dashboard.
- `src/app/page.tsx` links teachers to `/teacher/dashboard`.
- `src/components/layout/shell.tsx` teacher dashboard link points to `/dashboard`.

### Permanent Fix

Make `/teacher/dashboard` the canonical teacher dashboard route, and keep `/dashboard` as a backward-compatible redirect or alias.

Recommended implementation:

1. Move or duplicate the dashboard page into:
   - `src/app/teacher/dashboard/page.tsx`
2. Prefer extracting shared dashboard UI into:
   - `src/components/teacher/teacher-dashboard.tsx`
3. Replace `src/app/dashboard/page.tsx` with a redirect:
   ```ts
   import { redirect } from "next/navigation";
   export default function DashboardRedirect() {
     redirect("/teacher/dashboard");
   }
   ```
4. Update all teacher navigation and login callback defaults to `/teacher/dashboard`.
5. Update tests and docs to use `/teacher/dashboard`.

### Files To Change

- `src/app/teacher/dashboard/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/components/layout/shell.tsx`
- `src/app/login/page.tsx`
- `src/app/page.tsx`
- any tests referencing `/dashboard`

### Test Plan

Automated:

- Playwright:
  - `/teacher/dashboard` returns 200.
  - `/dashboard` redirects to `/teacher/dashboard`.
  - teacher login lands on `/teacher/dashboard`.

Manual:

```bash
curl -I http://localhost:3000/teacher/dashboard
curl -I http://localhost:3000/dashboard
```

### Acceptance Criteria

- Teacher CTA from homepage no longer leads to 404.
- Teacher dashboard canonical URL is stable.
- Old `/dashboard` route does not strand existing users.

## QA-3: Assessment Creation Form Validation

### Reported Behavior

QA initially listed this as an issue, then marked it resolved. Validation works for title, content selection, question count, and question types.

### Root Cause

No active defect. The important risk is regression because this form is a high-value teacher workflow.

### Permanent Fix

No product fix required. Add regression coverage so this stays fixed.

### Files To Change

- `tests/teacher.spec.ts`
- potentially component-level tests if the form is extracted later

### Test Plan

Automated Playwright coverage:

- Empty title shows validation toast.
- Question count `0` and `101` show validation toast.
- No content selected shows validation toast.
- No question type selected shows validation toast.

### Acceptance Criteria

- Existing validation behavior is covered by automated tests.

## QA-4: Teacher Navigation Shows Student Links

### Reported Behavior

Teacher pages display student links such as Upload, Quiz, History, and Progress.

### Root Cause

`AppShell` chooses navigation from `session.user.role`. If no session is loaded or the user is unauthenticated, `role` is undefined and the shell defaults to `studentLinks`.

That behavior is especially visible in QA because some teacher pages are accessible unauthenticated at the page shell level and only their APIs return `401`.

### Permanent Fix

Make navigation context route-aware and layout-aware, not only session-aware.

Recommended implementation:

1. Add an optional prop to `AppShell`:
   ```ts
   type AppShellMode = "student" | "teacher" | "auto";
   export function AppShell({ children, mode = "auto" }: ...)
   ```
2. In `src/app/teacher/layout.tsx`, call:
   ```tsx
   <AppShell mode="teacher">{children}</AppShell>
   ```
3. In `src/app/student/layout.tsx`, call:
   ```tsx
   <AppShell mode="student">{children}</AppShell>
   ```
4. Keep `auto` for shared authenticated pages such as `/profile` and `/settings`.
5. Expand teacher links:
   - `/teacher/dashboard`
   - `/teacher/assessments`
   - `/teacher/content`
   - future reports link, if a general reports index exists
6. Update brand/home link to use the active shell mode.

### Files To Change

- `src/components/layout/shell.tsx`
- `src/app/teacher/layout.tsx`
- `src/app/student/layout.tsx`
- potentially `src/app/dashboard/layout.tsx`

### Test Plan

Automated:

- Render `/teacher/assessments` unauthenticated and assert teacher navigation labels.
- Render `/student/dashboard` and assert student navigation labels.
- Login as teacher and assert no student-only links appear.

Manual:

- Visit `/teacher/assessments`.
- Sidebar should show teacher dashboard, assessments, content.

### Acceptance Criteria

- Teacher routes always show teacher navigation, even before session fetch completes.
- Student routes always show student navigation.
- Shared pages still use role when authenticated.

## QA-5: Student Progress Page Critical Error

### Reported Behavior

`/student/progress` crashes with:

```text
Cannot read properties of undefined (reading 'length')
```

### Root Cause

The page stores any JSON response as `ProgressData`, including API errors. When unauthenticated, `/api/student/progress` returns:

```json
{"error":"Unauthorized"}
```

The component then evaluates:

```ts
data!.weakAreas.length
data!.recentTrend.length
```

Because `weakAreas` and `recentTrend` do not exist on the error object, the page crashes.

This is a client/API contract bug, not only a missing null check.

### Permanent Fix

Treat non-OK API responses as non-data and normalize successful data before render.

Recommended implementation:

1. In `src/app/student/progress/page.tsx`, handle `401` explicitly:
   - redirect to `/login?callbackUrl=/student/progress`, or
   - show an auth-required state consistent with other student pages.
2. For any non-OK status, do not call `setData(d)` as if it were progress data.
3. Normalize successful response:
   ```ts
   const normalized: ProgressData = {
     totalAttempts: Number(d.totalAttempts ?? 0),
     averageScore: Number(d.averageScore ?? 0),
     completionRate: Number(d.completionRate ?? 0),
     weakAreas: Array.isArray(d.weakAreas) ? d.weakAreas : [],
     recentTrend: Array.isArray(d.recentTrend) ? d.recentTrend : [],
   };
   ```
4. Add an `error` state for recoverable API failures.
5. Remove non-null assertions (`data!`) in render.
6. Optionally harden `/api/student/progress` to always return the full progress shape on success.

### Files To Change

- `src/app/student/progress/page.tsx`
- optionally `src/app/api/student/progress/route.ts`
- tests for progress page and progress API

### Test Plan

Automated:

- Mock `401` response and assert redirect/login state.
- Mock `{}` response and assert no crash.
- Mock empty progress shape and assert empty state.
- Mock populated progress shape and assert cards/trend render.

Manual:

```bash
curl -i http://localhost:3000/api/student/progress
```

Expected unauthenticated: `401`.

Then visit `/student/progress` unauthenticated. Expected: no crash; redirect or auth-required state.

### Acceptance Criteria

- `/student/progress` never crashes on `401`, `500`, malformed JSON, or empty arrays.
- Empty progress state renders for authenticated users with no attempts.
- Populated progress state renders correctly.

## QA-6: Teacher Content Page Missing

### Reported Behavior

`GET /teacher/content` returns `404`.

### Root Cause

The API exists at `src/app/api/teacher/content/route.ts`, but there is no page at `src/app/teacher/content/page.tsx`.

The teacher assessment creation form already fetches `/api/teacher/content`, so this is a missing UI surface rather than missing backend data.

### Permanent Fix

Create a teacher content library page that uses the existing teacher content API and matches teacher workflows.

Recommended implementation:

1. Add `src/app/teacher/content/page.tsx`.
2. Fetch `/api/teacher/content`.
3. Handle `401` and `403` without crashing.
4. Render:
   - page title: Content Library;
   - upload/add content action, if teacher upload exists or can reuse student upload;
   - content cards/table with title, type, created date;
   - empty state explaining content is needed before assessment generation;
   - links/actions to create assessment from content.
5. Decide upload ownership:
   - If teachers can upload content through the same API as students, expose a teacher upload route.
   - If content upload is student-only today, add a teacher upload route or clearly link to assessment creation content requirements.

### Files To Change

- `src/app/teacher/content/page.tsx`
- `src/components/layout/shell.tsx`
- potentially `src/app/teacher/upload/page.tsx` or shared upload component later

### Test Plan

Automated:

- `/teacher/content` page loads.
- Empty state renders.
- Unauthorized fetch does not crash.
- Mock content list renders rows/cards.

Manual:

```bash
curl -I http://localhost:3000/teacher/content
```

Expected: `200`, not `404`.

### Acceptance Criteria

- Teachers can open `/teacher/content`.
- Sidebar includes Content.
- Page handles empty, loading, unauthorized, and populated states.

## Cross-Cutting Fixes

### 1. Standardize Client Fetch Handling

Several client pages use the pattern:

```ts
fetch(url).then((r) => r.json()).then(setData)
```

This is fragile because `{ error }` payloads are treated as success data.

Recommended shared helper:

```ts
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, payload?.error || "Request failed");
  }
  return payload as T;
}
```

Apply first to high-risk pages:

- `src/app/student/progress/page.tsx`
- `src/app/dashboard/page.tsx` or new teacher dashboard page
- `src/app/teacher/assessments/page.tsx`
- `src/app/teacher/content/page.tsx`

### 2. Protect Page Routes, Not Only APIs

Many pages render shells while APIs return `401`. That is acceptable for some public previews, but authenticated product areas should consistently redirect or show an auth-required state.

Recommended:

- Add layout-level auth behavior for `student` and `teacher` sections.
- Keep API authorization as the source of truth.
- Avoid relying only on client fetch failures to reveal auth state.

### 3. Align Route Naming

Current route naming mixes `/dashboard` and `/teacher/*`. Pick one canonical shape:

- Student: `/student/dashboard`, `/student/content`, `/student/progress`
- Teacher: `/teacher/dashboard`, `/teacher/assessments`, `/teacher/content`

Keep old routes as redirects only.

### 4. Improve QA Testability

The QA report was blocked because registration failed and existing credentials were unknown.

Recommended:

- Maintain deterministic seed credentials for local/staging QA:
  - `student@example.com / password123`
  - `teacher@example.com / password123`
- Add a staging-only seed process or documented Supabase seed SQL.
- Ensure seeded bcrypt hashes match `bcryptjs.compare`.

## Recommended Execution Order

1. QA-1: Fix registration service-role configuration.
2. QA-5: Fix progress page API error handling.
3. QA-2: Add `/teacher/dashboard` and redirect `/dashboard`.
4. QA-6: Add `/teacher/content`.
5. QA-4: Make navigation layout-aware and add teacher content link.
6. QA-3: Add regression tests for assessment form validation.
7. Re-run authenticated QA flows that were blocked by registration.

## Final Verification Checklist

Run local gates:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

Manual smoke:

```bash
curl -i http://localhost:3000/api/health
curl -i http://localhost:3000/teacher/dashboard
curl -i http://localhost:3000/teacher/content
curl -i http://localhost:3000/api/student/progress
```

Authenticated browser QA:

- Register student.
- Register teacher.
- Login student and visit dashboard, upload, content, quiz, history, progress.
- Login teacher and visit dashboard, assessments, content, assessment detail.
- Confirm teacher sidebar never shows student-only links.

## Definition Of Done

All QA findings are considered resolved when:

- registration succeeds with configured service role and fails clearly without it;
- `/student/progress` cannot crash on API errors or empty data;
- `/teacher/dashboard` and `/teacher/content` both return 200;
- teacher routes show teacher navigation;
- assessment validation remains covered by tests;
- QA can complete previously blocked authenticated flows.
