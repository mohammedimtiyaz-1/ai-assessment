# AI Tutor — Refresh Technical Details and Implementation Plan

Version: 1.0
Last updated: 2026-05-15
Owner: Architecture / CTO Review

## 1. Purpose
This document translates the finalized requirements into a concrete implementation plan.

It is written as an architecture-grade delivery guide for engineering, QA, and design. It uses the exact technology stack already present in the repository and avoids introducing a new framework or replacement library unless the existing codebase already uses it.

## 2. Confirmed Repository Stack
This is the exact stack observed in the current repo.

### 2.1 Runtime and Framework
- **Node.js**: `>=18.17.0`
- **Package manager**: `pnpm@9.1.2`
- **Web framework**: `Next.js ^14.2.0`
- **React**: `^18.3.0`
- **TypeScript**: `^5.4.0`
- **App router**: used via `src/app`
- **Font**: `Inter` via `next/font/google`

### 2.2 Frontend UI Stack
- **Tailwind CSS**: `^3.4.3`
- **Tailwind animation plugin**: `tailwindcss-animate`
- **Shadcn styling**: `shadcn/tailwind.css` imported globally
- **Shadcn/ui primitives**: present through project components and Radix-based composition
- **Radix UI**: dialog, dropdown-menu, label, slot, tabs, toast
- **Icons**: `lucide-react` and `@hugeicons/react`
- **Animations**: `framer-motion`
- **Class utility helpers**: `clsx`, `class-variance-authority`, `tailwind-merge`

### 2.3 Form and Validation Stack
- **React Hook Form**: `react-hook-form`
- **Resolvers**: `@hookform/resolvers`
- **Schema validation**: `zod`

### 2.4 Authentication Stack
- **Authentication**: `next-auth ^5.0.0-beta.13`
- **Adapter**: `@auth/prisma-adapter` is installed, but the current repo auth flow uses the credentials provider and repository-backed verification
- **Session strategy**: JWT
- **Providers**: Credentials provider
- **Auth route pages**: `/login`, `/signup`, `/forgot-password`, `/verify-email`
- **Session provider**: `SessionProvider` wrapped in `src/components/providers.tsx`

### 2.5 Database and Server Data Stack
- **Database**: PostgreSQL
- **Driver**: `pg`
- **Migrations**: `node-pg-migrate`
- **Vector support**: `pgvector`
- **Repository pattern**: data access is done through repository modules under `src/modules/**`
- **Database access helper**: `src/lib/db.ts`

### 2.6 AI and Workflow Stack
- **OpenAI SDK**: `openai`
- **Mastra**: `mastra`, `@mastra/core`, `@mastra/memory`, `@mastra/rag`
- **Use case**: content understanding, question generation, retrieval, and agentic workflows when required by the product logic

### 2.7 Observability and Runtime Utilities
- **Logger**: `pino`
- **Password hashing**: `bcrypt`
- **Identifiers**: `uuid`
- **Email**: `resend` is installed

### 2.8 Build and Deployment Settings
- **Next config** uses `reactStrictMode`, `swcMinify`, and server actions body size limit.
- **Webpack client fallbacks** exclude `fs`, `net`, `tls`, `crypto` on the client bundle.
- **Client bundle external**: `bcrypt` is excluded from the client bundle.
- **Environment variables validated at startup** through `src/lib/env.ts`.

## 3. Exact Environment Variables in Use
The implementation plan must preserve these variables and not rename them.

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `OPENAI_API_KEY`
- `NODE_ENV`
- `LOG_LEVEL`

## 4. Global Architectural Constraints
- Keep the application as a **single Next.js application**.
- Use the existing **repository pattern** for database access.
- Use the existing **credentials-based NextAuth flow**.
- Keep all teacher/student/public flows in the existing app router structure.
- Do not introduce a new frontend framework or a new database abstraction layer.
- Reuse the current CSS variable theme system and Shadcn-style component language.
- Use server-side validation for all critical rules.

## 5. Architecture Summary
The product should remain a modular monolith with the following logical domains:
- **Auth/Roles**
- **Content ingestion**
- **Question generation**
- **Assessments and links**
- **Quiz runtime and grading**
- **Student reporting**
- **Teacher reporting**
- **Profile/settings UI**

All domains live inside the same Next.js application and communicate through route handlers, service modules, and repositories.

## 6. Implementation Plan by Phase

### Phase 0 — Technical Foundations and Audit
#### Goal
Confirm the existing repository baseline, current layout, and all assumptions before new implementation work begins.

#### Frontend work
- Keep the current App Router structure.
- Confirm the root layout uses `Inter` and the shared `Providers` wrapper.
- Preserve the existing global theme tokens defined in `globals.css`.
- Confirm the reusable sidebar/header patterns already present in the app.

#### Backend work
- Validate that `src/lib/env.ts` is the source of truth for env validation.
- Validate that `src/lib/db.ts` is the database access entry point.
- Validate that `src/lib/auth.ts` is the single NextAuth configuration point.
- Confirm repository modules are the authoritative data-access layer.

#### Technical deliverables
- Stack inventory.
- Route inventory.
- Database schema inventory.
- List of missing or incomplete flows.
- List of risk areas that may affect implementation.

#### Exit criteria
- Architecture is understood and no new tech is introduced accidentally.
- Required env variables and theme tokens are confirmed.
- The engineering plan is aligned to the live codebase.

---

### Phase 1 — Design System and Shell Unification
#### Goal
Create a single visual system for public, student, and teacher screens so the product feels cohesive.

#### Frontend work
- Reuse the current Tailwind token system from `globals.css` and `tailwind.config.ts`.
- Continue using color variables such as `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--card`, `--popover`, `--sidebar-*`.
- Use shared UI primitives and avoid one-off styling patterns.
- Standardize common components:
  - page shell
  - top navigation
  - sidebar
  - card
  - button
  - input
  - badge
  - table
  - modal/dialog
  - toast
  - skeleton
- Ensure page transitions and section transitions use `framer-motion` only where it adds clarity.

#### Backend work
- None beyond supporting content needed for shell state.

#### Technical deliverables
- Unified page shell spec.
- Shared spacing and layout rules.
- Shared motion guidelines.
- Shared empty-state patterns.

#### Exit criteria
- Public, student, and teacher pages visually share one common design language.
- No duplicate layout behavior is introduced.

---

### Phase 2 — Authentication, Roles, and Session Refresh
#### Goal
Make login, role awareness, and upgrade-to-teacher behavior deterministic.

#### Frontend work
- Keep login UI on `/login`.
- Keep all auth screens aligned with current route names.
- Ensure the UI reads session state through `SessionProvider` and `useSession`.
- Preserve the current role-aware navigation logic.
- Maintain clear redirects:
  - student → `/student/dashboard`
  - teacher/admin → `/dashboard`
- Implement upgrade UX so that role changes are followed by a fresh session acquisition.

#### Backend work
- Keep `src/lib/auth.ts` as the single auth source.
- Preserve JWT session strategy.
- Keep `session.user.id` and `session.user.role` injected in callbacks.
- Preserve credentials authorization through repository-backed password verification.

#### Technical deliverables
- Auth flow map.
- Role state diagram.
- Redirect rules.
- Session refresh strategy.

#### Exit criteria
- Login routes users to the correct area.
- Role changes are reflected only after a refreshed session.
- Teacher routes never depend on stale client auth state.

---

### Phase 3 — Student Experience Core
#### Goal
Deliver the student self-assessment flow end to end.

#### Frontend work
- Build or finalize:
  - `/student/dashboard`
  - `/student/upload`
  - `/student/content`
  - `/student/quiz`
  - `/quiz/[quizSessionId]`
  - `/student/history`
  - `/student/progress`
- Use dashboard cards, content cards, progress modules, and quiz runtime UI consistently.
- Use `react-hook-form` and `zod` for any student-side input forms.
- Use skeleton states and progressive loading.
- Keep the quiz runtime distraction-free and readable.

#### Backend work
- Ensure student-owned content can be read and practiced through repository-backed APIs.
- Ensure quiz sessions can be created and updated server-side.
- Ensure answer submission and result calculation stay server authoritative.

#### Technical deliverables
- Student dashboard data contract.
- Content upload contract.
- Quiz runtime contract.
- Attempt history contract.
- Progress summary contract.

#### Exit criteria
- A student can sign in, upload content, generate a practice session, answer questions, and see results.
- Student routes only show student-owned data.

---

### Phase 4 — Content Ingestion and Question Generation
#### Goal
Preserve and strengthen the content-to-questions learning loop.

#### Frontend work
- Keep upload interactions simple and guided.
- Show processing states clearly.
- Provide clear links between uploaded content and generated questions.

#### Backend work
- Reuse current ingestion and repository patterns under `src/modules/ingestion`.
- Reuse current AI tooling under `src/ai/config.ts` and the installed Mastra/OpenAI stack.
- Use `zod` to validate payloads entering generation and ingestion flows.
- Store generated data using the existing PostgreSQL repository model.

#### Technical deliverables
- Ingestion pipeline spec.
- Question generation request/response schema.
- Artifact storage rules.
- Retry and failure handling rules.

#### Exit criteria
- Content ingestion and question generation work without changing the repo architecture.
- Generated questions are reusable by both student practice and teacher assessments.

---

### Phase 5 — Teacher Assessment Management
#### Goal
Deliver the teacher workspace for creating, editing, and configuring assessments.

#### Frontend work
- Build or finalize:
  - `/dashboard`
  - `/teacher/assessments`
  - `/teacher/assessments/[id]`
  - `/teacher/assessments/[id]/report`
- Reuse teacher shell patterns already present in the codebase.
- Keep the assessment detail page modular:
  - assessment summary
  - config form
  - linked content
  - question generation area
  - share link area
  - readiness status panel
- Use `react-hook-form` + `zod` for configuration forms.

#### Backend work
- Add or extend teacher assessment route handlers under `src/app/api/teacher/**`.
- Implement owner checks using `auth()` and repository ownership verification.
- Persist assessment config and share-link metadata through PostgreSQL repositories.

#### Technical deliverables
- Teacher assessment creation spec.
- Assessment config schema.
- Ownership rules.
- Link lifecycle rules.

#### Exit criteria
- A teacher can create an assessment, configure it, attach content, generate questions, and publish it.

---

### Phase 6 — Public Link Resolution and Guest Access
#### Goal
Make `/a/[token]` the canonical entry point for shared assessments.

#### Frontend work
- Build the public join page for `/a/[token]`.
- Show:
  - assessment title
  - description
  - rules summary
  - guest name input when required
  - access code input when required
  - start button
- Make invalid token, expired token, and blocked states visually clear.

#### Backend work
- Implement or extend `GET /api/public/assessments/resolve`.
- Implement or extend `POST /api/assessments/:id/start`.
- Keep token lookup and link validity on the server.
- Enforce login requirement, guest mode, access code, and availability in the start route.

#### Technical deliverables
- Public resolve schema.
- Guest start schema.
- Token lifecycle rules.
- Error taxonomy for 404/401/403/410/400 cases.

#### Exit criteria
- A valid token can be opened by a student or guest.
- A guest can start only when allowed and only with a name.
- Invalid or expired links never start a quiz.

---

### Phase 7 — Quiz Runtime, Server Enforcement, and Grading
#### Goal
Ensure the quiz flow is authoritative, timed, and consistent.

#### Frontend work
- Use a focused quiz runtime that keeps attention on the question.
- Show timer and progress only when relevant.
- Disable interaction when the server marks the session expired.
- Provide completion and result transitions that feel immediate and understandable.

#### Backend work
- Ensure quiz session creation includes a constraints snapshot.
- Ensure late submissions are rejected on the server.
- Ensure the quiz runtime reads authoritative session state from the backend.
- Keep grading logic inside server-side services and repositories.

#### Technical deliverables
- Session state model.
- Answer submission contract.
- Timer/expiry enforcement spec.
- Result visibility policy.

#### Exit criteria
- Time limits are enforced server-side.
- Attempts cannot continue after expiry.
- Results follow the configured visibility policy.

---

### Phase 8 — Reporting and Analytics
#### Goal
Show simple, useful outcomes without adding CSV export.

#### Frontend work
- Teacher report page must show:
  - total attempts
  - completions
  - average score
  - question summary
  - student result rows
- Student history/progress pages must show learner-facing analytics.

#### Backend work
- Implement aggregate queries in repository/service layers.
- Keep report data reads efficient and safe.
- Avoid exposing unnecessary raw data.

#### Technical deliverables
- Reporting query map.
- KPI definitions.
- Result aggregation rules.

#### Exit criteria
- Teachers can see basic performance data directly in the app.
- No CSV export is required for MVP completion.

---

### Phase 9 — Validation, Logging, and Error Handling
#### Goal
Make the app robust and observable.

#### Frontend work
- Show inline validation errors using the existing form stack.
- Use toast or alert states for non-blocking failures.
- Use skeletons for loading and friendly empty states for no-data cases.

#### Backend work
- Validate all write inputs using `zod`.
- Log through `pino` with request-friendly structured messages.
- Keep the DB query helper logging detailed but safe.
- Ensure errors are deterministic and mapped to the correct status codes.

#### Technical deliverables
- Validation schema list.
- Error mapping table.
- Logging conventions.

#### Exit criteria
- Failures are understandable to users and debuggable for engineers.

---

### Phase 10 — Testing and Release Hardening
#### Goal
Lock the MVP down with tests and a release-ready quality bar.

#### Frontend work
- Add component-level tests for key UI states.
- Add route rendering tests for critical screens.

#### Backend work
- Add unit tests for repositories and service rules.
- Add integration tests for:
  - auth
  - role upgrade
  - public resolve
  - quiz start
  - time limit enforcement
  - teacher link creation

#### Technical deliverables
- Test matrix.
- Release checklist.
- Regression checklist.

#### Exit criteria
- The MVP can be shipped with confidence and no known broken critical flows.

## 7. Phase-by-Phase Stack Usage Rules
### 7.1 Frontend Rules
- Use Next.js App Router only.
- Use React 18 client components only where needed.
- Use Tailwind utility classes and the existing CSS variable theme.
- Use `framer-motion` only for purposeful animation.
- Use Radix/Shadcn-style primitives for dialogs, dropdowns, tabs, labels, and toast interactions.
- Use `react-hook-form` + `zod` for forms.

### 7.2 Backend Rules
- Use route handlers under `src/app/api/**`.
- Use repository modules for database access.
- Use `pg` + `node-pg-migrate` for schema changes.
- Use `auth()` from `src/lib/auth.ts` for authorization decisions.
- Use `bcrypt` server-side only.

### 7.3 AI Rules
- Reuse the installed OpenAI and Mastra stack.
- Keep AI orchestration behind service boundaries.
- Do not move AI logic into random route files when a domain module can own it.

### 7.4 Environment Rules
- Keep the existing env variable names exactly as defined.
- Do not introduce new env names unless a real feature requires them.

## 8. Concrete Technical Deliverables by Layer
### 8.1 Frontend Deliverables
- App shells for public, student, teacher, and auth flows.
- Shared component library usage.
- Responsive forms and dashboards.
- Motion and loading state system.

### 8.2 Backend Deliverables
- Assessment APIs.
- Public resolve APIs.
- Session and attempt APIs.
- Reporting APIs.
- Role update APIs.

### 8.3 Data Deliverables
- Migrations for assessments, links, sessions, and related tables.
- Repository methods for create/read/update/reporting flows.

### 8.4 Quality Deliverables
- Validation.
- Logging.
- Testing.
- Security checks.

## 9. Recommended Implementation Order
1. Audit stack and architecture.
2. Unify design system and shells.
3. Stabilize auth and role refresh.
4. Implement student flows.
5. Implement ingestion and question generation.
6. Implement teacher assessment creation.
7. Implement public link flow.
8. Implement quiz runtime and enforcement.
9. Implement reporting.
10. Add validation, logging, and tests.
11. Hardening and release.

## 10. Phase Completion Criteria
Each phase is complete only if:
- The code uses the existing stack only.
- The phase’s routes and APIs work in the current app router structure.
- Errors are handled intentionally.
- The UI remains consistent with the shared theme.
- Tests or manual verification cover the new behavior.

## 11. Final CTO Notes
- The safest path is incremental delivery with additive changes.
- The current codebase already contains the right foundation: Next.js App Router, Tailwind, Shadcn-style UI, NextAuth, PostgreSQL, repository pattern, Pino logging, and Zod validation.
- The MVP should prioritize functional correctness over new platform experimentation.
- Every new screen should reuse the existing theme tokens, spacing, and interaction patterns rather than inventing a new visual language.
