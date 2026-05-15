# AI Tutor — Finalized MVP Requirements (Concrete SRS)

Version: 2.0
Last updated: 2026-05-15
Owner: Product & Engineering

## 1. Document Purpose
This document is the final concrete MVP requirements specification for AI Tutor. It defines:
- The exact pages that exist in the MVP.
- The exact user flows for student self-assessment, teacher classroom assessment, public assessment links, and role upgrade.
- The precise login behavior, route transitions, validation rules, and server-side constraints.
- The backend APIs, data model, and operational requirements needed to implement the MVP safely.

This document is intentionally specific enough to hand to engineering and QA as the source of truth for MVP delivery.

## 2. Product Objective and MVP Principles
### 2.1 Product Objective
- Deliver a minimal but complete AI learning platform for self-directed students.
- Allow teachers to create assessments, share them using tokenized public links, and view basic performance outcomes.
- Keep the experience simple, fast, and understandable.

### 2.2 MVP Principles
- Student-first, B2C-first product behavior.
- Minimal screens, minimal navigation noise, no duplicate workflows.
- Server is the source of truth for access, time limits, and attempt validity.
- Public links must work without requiring students to understand internal system details.
- Any information not needed for the current step must be hidden until the user reaches the relevant page.

### 2.3 Explicit MVP Non-Goals
- No CSV export.
- No classroom roster management.
- No multi-school organization layer.
- No proctoring or anti-cheat beyond standard access control and server validation.
- No advanced analytics or custom reporting builder.

## 3. Personas, Roles, and Access Rules
### 3.1 Personas
- **Student**: Learner who uploads content, studies, takes quizzes, and may join teacher assessments.
- **Guest Student**: Learner using a public link when `requireLogin=false`; must provide a name.
- **Teacher**: Creates assessments, attaches materials, shares links, and reviews results.
- **Admin**: Has teacher permissions plus elevated access for moderation and maintenance.

### 3.2 Role Definitions
- `student`
- `teacher`
- `admin`
- `super_admin`

### 3.3 Route Access Matrix
| Route Group | Student | Guest | Teacher/Admin |
| --- | --- | --- | --- |
| `/` public home | Yes | Yes | Yes |
| `/login`, `/signup`, `/forgot-password` | Yes | Yes | Yes |
| `/student/*` | Yes | No | Optional view-only if useful, but not required |
| `/profile`, `/settings` | Yes | No | Yes |
| `/dashboard`, `/teacher/*` | No | No | Yes |
| `/a/[token]` | Yes | Yes | Yes |

### 3.4 Route Guard Rules
- Anonymous users trying to open authenticated pages must be redirected to `/login`.
- Teachers can open teacher pages only if their session role is `teacher`, `admin`, or `super_admin`.
- Students must not access teacher-only APIs or pages.
- If a user is signed in with an insufficient role, the page must show a clear forbidden state rather than failing silently.

## 4. Route Map and Page Transitions
### 4.1 Public Routes
| Route | Purpose | Entry Behavior | Exit / Next Step |
| --- | --- | --- | --- |
| `/` | Marketing home | Shows different CTAs depending on auth state | Login, signup, student dashboard, teacher dashboard, public exam link |
| `/login` | Sign-in | Accepts email/password | Student → `/student/dashboard`; Teacher → `/dashboard` |
| `/signup` | Registration | Creates account | Next route determined by role | 
| `/forgot-password` | Password reset entry | Request reset email | Return to login after completion |
| `/a/[token]` | Public assessment entry | Resolves token and shows rules | Start session or show error |

### 4.2 Student Routes
| Route | Purpose | Entry Behavior | Exit / Next Step |
| --- | --- | --- | --- |
| `/student/dashboard` | Student home | Loads student stats and actions | Upload, content, quiz, history, progress |
| `/student/upload` | Add content | Upload progress, validation, submit | Redirect to content detail or dashboard |
| `/student/content` | Content library | Shows uploaded materials | Open content detail or start practice |
| `/student/quiz` | Student quiz entry | Lets student choose practice path | Creates session and redirects to runtime quiz |
| `/quiz/[quizSessionId]` | Active quiz runtime | Loads session data and timer | Submit quiz or auto-complete on expiry |
| `/student/history` | Attempt history | Shows attempts and results | Open detail or return dashboard |
| `/student/progress` | Progress analytics | Shows charts and weak areas | Return dashboard or content |

### 4.3 Teacher Routes
| Route | Purpose | Entry Behavior | Exit / Next Step |
| --- | --- | --- | --- |
| `/dashboard` | Teacher home | Loads teacher summary and shortcuts | Assessments, reports, settings |
| `/teacher/assessments` | Assessment list | Shows all assessments owned by teacher | Open detail or create new assessment |
| `/teacher/assessments/[id]` | Assessment detail | Loads config, content, question binding, links | Generate, share, edit, report |
| `/teacher/assessments/[id]/report` | Assessment report | Shows attempts and basic outcomes | Back to assessment detail |
| `/dashboard/settings` | Teacher settings | Role, notification, appearance settings | Back to dashboard |

### 4.4 Authenticated Shared Routes
| Route | Purpose | Entry Behavior | Exit / Next Step |
| --- | --- | --- | --- |
| `/profile` | User profile | Shows profile form with current values | Save, return dashboard, or move to settings |
| `/settings` | User settings | Shows preferences and role controls | Save and remain on page |

## 5. Detailed User Flows
### 5.1 Public Home Flow
1. User opens `/`.
2. If not signed in, the page shows `Sign In` and `Get Started`.
3. If signed in as student, the page shows `Student Dashboard` and `Take a Practice Exam`.
4. If signed in as teacher/admin, the page shows `Dashboard` and `Teacher` access.
5. “Become a Teacher” appears only for students.
6. Clicking “Become a Teacher” starts the upgrade flow described in Section 5.4.

### 5.2 Student Self-Assessment Flow
1. User signs in as student.
2. User lands on `/student/dashboard`.
3. User can upload study material from `/student/upload`.
4. Uploaded material appears in `/student/content`.
5. User chooses to generate practice questions.
6. The app creates or reuses a quiz session and redirects to `/quiz/[quizSessionId]`.
7. User answers MCQs.
8. The user submits the quiz or the server ends it when the timer expires.
9. Results appear immediately or according to `resultVisibility`.
10. The attempt is written to history and progress is updated.

### 5.3 Teacher Classroom Assessment Flow
1. User signs in as teacher.
2. User lands on `/dashboard`.
3. User opens `/teacher/assessments` to create or manage assessments.
4. User creates an assessment with title, description, and config.
5. User attaches study content or selects existing content.
6. User generates questions and reviews the generated set.
7. User publishes the assessment.
8. User opens the share section and creates a tokenized public link.
9. User optionally sets an access code and expiry.
10. User shares the `/a/[token]` URL with students.
11. User views results in dashboard/report screens.

### 5.4 Role Upgrade Flow
1. Student is signed in.
2. Student clicks `Become a Teacher` from `/`.
3. UI calls `POST /api/user/role` with `{ role: 'teacher' }`.
4. If successful, the app must force a fresh auth session.
5. The recommended behavior is to sign the user out and redirect them to login with a return path to the teacher area.
6. After the user signs in again, the role must resolve to teacher and teacher routes become accessible.

### 5.5 Public Guest Assessment Flow
1. User opens `/a/[token]`.
2. The page resolves the token using `GET /api/public/assessments/resolve?token=...`.
3. If the link is valid, the page shows assessment title, description, and rules.
4. If `requireLogin=true`, the page shows a login requirement state and the user must sign in.
5. If `requireLogin=false`, the page shows a guest flow:
   - name input
   - optional access code input
   - token display or hidden token field depending on UI design
6. User clicks `Start Exam`.
7. The app calls `POST /api/assessments/:id/start`.
8. If successful, the app redirects to `/quiz/[quizSessionId]`.
9. Results are shown according to visibility rules.

### 5.6 Login and Redirect Flow
- On `/login`, if the user signs in successfully:
  - students must go to `/student/dashboard`
  - teachers/admins must go to `/dashboard`
- If the user arrived from a protected page, the app should preserve the intended destination as a redirect parameter where possible.
- If a teacher upgrade requires re-authentication, the login page should preserve the teacher route as the return path.

## 6. Page-by-Page Concrete Requirements
### 6.1 Home Page `/`
- Must be the first public landing page.
- Must show a hero section, clear value proposition, and student-focused CTAs.
- Must show role-aware actions when a session exists.
- Must show the `Become a Teacher` CTA only for authenticated students.
- Must not show teacher-only links to anonymous users.
- Must use a minimal visual layout with subtle motion and no repeated UI blocks.

### 6.2 Login `/login`
- Email and password fields are required.
- On submit:
  - validate client-side for empty fields
  - submit to auth provider
  - show loading state
  - redirect based on role
- On failure, show a clear inline error.

### 6.3 Signup `/signup`
- Collect only essential fields required by the current auth system.
- On success, route the user according to their default role.
- If the account starts as student, route to `/student/dashboard`.

### 6.4 Forgot Password `/forgot-password`
- Accept an email address.
- Trigger password reset flow.
- Show success message that a reset email was sent.

### 6.5 Student Dashboard `/student/dashboard`
- Must show current totals for uploaded content, attempts, accuracy, and study time.
- Must show quick actions for upload and practice.
- Must show recent content and recent exams.
- Must show recommended next steps.
- Empty state must guide the student to upload their first content.

### 6.6 Upload `/student/upload`
- Must accept file input and any supported upload mechanism already present in the project.
- Must validate file type and size.
- Must show upload progress and completion feedback.
- On success, redirect to content library or show the uploaded item in context.

### 6.7 Content `/student/content`
- Must list uploaded materials.
- Must let the student open a content detail view.
- Must let the student generate or start practice from content.

### 6.8 Quiz Entry `/student/quiz`
- Must allow the student to start a practice session.
- Must show available content or exam options.
- Must redirect into `/quiz/[quizSessionId]` once the attempt is created.

### 6.9 Active Quiz `/quiz/[quizSessionId]`
- Must load the quiz session from the server.
- Must show question progress, answer controls, and timer if configured.
- Must prevent accidental loss of progress where feasible.
- Must submit answers to the server.
- Must respect server-side expiry and end-of-session rules.

### 6.10 History `/student/history`
- Must list prior attempts with scores and dates.
- Must allow the student to inspect previous attempts if result visibility allows it.

### 6.11 Progress `/student/progress`
- Must show mastery, weak areas, and trend charts.
- Must not overload the page with raw data.

### 6.12 Profile `/profile`
- Must show current profile data with clearly labeled editable fields.
- Must visually differentiate actual saved data from placeholders.
- Must use the shared navigation shell.
- Must allow saving updated profile fields.

### 6.13 Settings `/settings`
- Must show role-aware settings.
- Must show notification and appearance options.
- Must include role switching only when appropriate.

### 6.14 Teacher Dashboard `/dashboard`
- Must show teacher workspace summary.
- Must show assessment counts, publishing status, and setup completion status.
- Must expose navigation to assessments and reports.

### 6.15 Assessments List `/teacher/assessments`
- Must list all teacher-owned assessments.
- Must show status indicators such as needs material, ready, or published.
- Must allow create/open actions.

### 6.16 Assessment Detail `/teacher/assessments/[id]`
- Must show assessment title, description, config, and linked content.
- Must let the teacher attach study material.
- Must let the teacher generate questions.
- Must let the teacher create, rotate, enable, or disable share links.
- Must expose a concise summary of active constraints.

### 6.17 Report `/teacher/assessments/[id]/report`
- Must show total attempts, completions, average score, and per-question summary.
- Must show student-level results in a simple table.
- Must not require CSV export for MVP.

### 6.18 Public Assessment Entry `/a/[token]`
- Must resolve the token on page load.
- Must show the assessment title and rules.
- Must display guest name input when login is not required.
- Must display access code input only when the link requires one.
- Must provide a clear start button.
- Must show clear error states for invalid or expired links.

## 7. Assessment and Quiz Configuration
### 7.1 Assessment Config Fields
The `assessments.config` object must support:
- `questionCount`
- `difficulty`
- `formats`
- `timeLimitSec`
- `allowedAttempts`
- `availability.startAt`
- `availability.endAt`
- `resultVisibility`
- `randomized`
- `requireLogin`
- `sameQuestions`

### 7.2 Result Visibility
The MVP must support:
- `none`
- `score_only`
- `after_deadline_full`
- `immediate_full`

### 7.3 Assessment State Requirements
- Draft: created but not published.
- Ready: has content and questions bound.
- Published: shareable via token link.
- Disabled/Archived: not shareable; links should fail to start.

## 8. Backend Requirements
### 8.1 Server Ownership
- All access checks, time-limit checks, availability checks, and attempts checks must happen on the server.
- Client-side timers are only advisory.

### 8.2 Route Handlers
The following routes are required as MVP API surface:
- `POST /api/user/role`
- `GET /api/public/assessments/resolve?token=...`
- `POST /api/assessments/:id/start`
- `GET /api/teacher/assessments/:id/link`
- `POST /api/teacher/assessments/:id/link`

### 8.3 API Behavior
#### `POST /api/user/role`
- Requires auth.
- Accepts `{ role: 'teacher' | 'student' }`.
- Must persist the role change.
- Must force session refresh because the current session may be stale.

#### `GET /api/public/assessments/resolve`
- Auth not required.
- Returns only the metadata needed to render the public entry page.
- Must not expose the access code hash or any hidden internal state.
- Returns 404 for invalid, inactive, or expired tokens.

#### `POST /api/assessments/:id/start`
- Accepts `{ token, accessCode?, name? }`.
- If `requireLogin=true`, require an authenticated session.
- If `requireLogin=false`, allow a guest and require a guest name.
- Must validate that the token resolves to the same assessment.
- Must validate time window and attempts.
- Must create a quiz session and snapshot all relevant constraints.

#### `GET|POST /api/teacher/assessments/:id/link`
- Must be teacher-only and owner-only.
- GET lists existing links.
- POST creates a new tokenized link.
- The response must include a shareable `/a/[token]` URL.

### 8.4 Start Session Rules
- The start endpoint must be idempotent enough to handle retry scenarios safely.
- If the user clicks start twice, duplicate active session creation must be prevented or safely reconciled.
- Session creation must store a snapshot of the assessment configuration.

## 9. Data Model Requirements
### 9.1 Core Tables
- `users`
- `content`
- `assessments`
- `assessment_links`
- `questions`
- `assessment_questions`
- `quiz_sessions`
- `quiz_answers` if needed by the implementation

### 9.2 Required Fields
#### `assessments`
- owner user id
- title
- description
- config JSON
- content association
- timestamps

#### `assessment_links`
- assessment id
- token
- access code hash
- expiry timestamp
- active flag
- created timestamp

#### `quiz_sessions`
- user id or guest marker
- student identifier for guest attempts
- question ids
- constraints snapshot
- started at
- finished at
- score

### 9.3 Data Integrity Rules
- Tokens must be unique.
- Access codes must never be stored in plaintext.
- Finished attempts must retain the constraints that were active at the moment the attempt started.
- Teacher edits after start must not mutate in-progress sessions.

## 10. Validation and Error Handling
### 10.1 Validation Rules
- Every required field must be validated before write operations.
- Guest names must be non-empty when guest mode is allowed.
- Access code must be checked server-side with a hash comparison.
- Time limit and availability must be checked on every relevant server action, not only at session start.

### 10.2 Error States
#### Public link errors
- Invalid or expired token → show link invalid message.
- Inactive link → show link unavailable message.
- Missing access code → ask for code and do not proceed.

#### Start errors
- Login required → prompt sign-in.
- Access code invalid → show generic retry error.
- Assessment not yet started / closed → show time window message.
- No questions bound → show teacher-facing setup error.
- Attempts exhausted → show a clear blocked state.

#### Role upgrade errors
- API failure → show upgrade failed error.
- Session refresh failure → ask the user to sign in again.

## 11. Guest Student Rules
- Guest access is allowed only when `requireLogin=false`.
- Guest users must enter a name before starting.
- The guest name must be stored with the session so teachers can see who attempted the assessment.
- If the assessment enforces attempt limits, the server must enforce limits for guests using the best available stable identifier (name plus link/session context as implemented).
- Guest access should not expose teacher-only data or dashboards.

## 12. Time Limit and Attempt Enforcement
- Time limits are authoritative on the server.
- When the client timer reaches zero, the UI must stop accepting answers and submit or lock the session.
- The server must reject any late answer or submit request after expiry.
- The server must also reject starts that occur outside the availability window.
- Attempt limits, when configured, must be enforced before starting a new quiz session.

## 13. UX, Motion, and Design Requirements
- Use one consistent layout pattern per role.
- Do not duplicate sidebar/header logic across pages.
- Use subtle, functional motion only.
- Use skeletons during loading and concise empty states when no data exists.
- Use clear visual hierarchy for editable values vs placeholders.
- Buttons, cards, and form states must have readable hover/focus states.

## 14. Observability and Metrics
### 14.1 Required Events
- Assessment created
- Assessment updated
- Assessment link created
- Public link resolved
- Quiz session started
- Quiz session completed
- Role changed

### 14.2 Required Metrics
- Student activation: upload → first practice exam within 24 hours.
- Teacher activation: create assessment → share link → at least one student starts.
- Assessment completion rate.
- Average score.
- Time on task.

## 15. Deployment and Environment Requirements
- The app must run as a Next.js application.
- Environment variables required:
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`
  - `NEXT_PUBLIC_APP_URL`
- Deployment target: Vercel or equivalent serverless deployment for the web app.
- Database must be a managed PostgreSQL instance.

## 16. Detailed Acceptance Criteria
- Students can sign in and land on the correct dashboard.
- Teachers can sign in and access teacher-only routes.
- Role upgrade changes the persisted role and the user can reach teacher pages after re-auth.
- Teacher can create an assessment, attach content, generate questions, and share a working tokenized link.
- Guest student can open `/a/[token]`, enter name if login is not required, and start the assessment.
- Server rejects invalid tokens, expired links, invalid access codes, and late answers.
- Self-assessment flow works end to end from content upload to results.
- Teacher report screens show the outcome clearly without CSV export.

## 17. Testing Strategy
### 17.1 Unit Tests
- Repository behavior
- Link resolution logic
- Start-session validation
- RBAC guards

### 17.2 Integration Tests
- Role upgrade and session refresh
- Public resolve and start flow
- Access code validation
- Availability and time-limit enforcement
- No-questions edge case

### 17.3 End-to-End Tests
- Student self-assessment flow
- Teacher assessment creation and sharing flow
- Guest public link flow
- Teacher route access after role upgrade

## 18. Risks and Constraints
- Public links can be brute-forced if rate limiting is too weak.
- Role upgrade must refresh auth correctly or teacher pages will remain blocked.
- A missing question set must block publish/start rather than failing later.
- Guest name handling must remain privacy-safe and minimal.

## 19. Final Definition of Done for the MVP
- The product supports student self-assessment and teacher assessment sharing end to end.
- The public link flow works for both login-required and guest-enabled assessments.
- Server-side validation is authoritative for access, time, and attempts.
- The UI is minimal, clear, accessible, and consistent across pages.
- The implementation is testable, observable, and ready for incremental expansion.

## 20. Implementation-Ready Acceptance Criteria by Page and API

### 20.1 `/` Home Page
- When the user is anonymous, the page shows only public navigation and public CTAs.
- When the user is logged in as a student, the page shows student-specific CTAs and the `Become a Teacher` CTA.
- When the user is logged in as teacher/admin, the page shows teacher-oriented entry actions and hides the student-only upgrade CTA.
- Clicking the student dashboard CTA routes to `/student/dashboard` without requiring an extra login step.
- Clicking the teacher dashboard CTA routes to `/dashboard` without requiring an extra login step.
- Clicking `Become a Teacher` triggers the role upgrade flow and then refreshes auth before teacher pages are accessed.

### 20.2 `/login`
- Submitting valid credentials authenticates the user and redirects to the correct landing page by role.
- Invalid credentials produce a visible inline error and do not change route.
- A successful login for a student routes to `/student/dashboard`.
- A successful login for a teacher/admin routes to `/dashboard`.
- If the login page was opened as part of a protected-route redirect, the intended destination is preserved when possible.

### 20.3 `/signup`
- The signup flow creates a new account using the minimum required fields.
- The account receives the correct default role.
- After account creation, the app routes the user to the correct initial dashboard.
- The page does not expose teacher-only controls to a new student account.

### 20.4 `/forgot-password`
- Entering a valid email triggers the reset flow and shows a confirmation message.
- Invalid email formatting is blocked before submit.
- The page does not reveal whether an account exists for the submitted email.

### 20.5 `/student/dashboard`
- The dashboard loads the authenticated student’s data only.
- The page renders without teacher-only sections.
- The quick actions allow access to upload and practice flows.
- Recent content and recent exam sections show relevant items or meaningful empty states.
- Progress and accuracy summaries reflect server data, not client-only calculations.

### 20.6 `/student/upload`
- Uploading valid content starts an upload state and completes successfully.
- Invalid file types or unsupported input are rejected before processing.
- On success, the uploaded item is persisted and visible in the student’s content library.
- The user receives immediate progress or completion feedback.

### 20.7 `/student/content`
- The content list shows only content owned by the current student.
- Each item is openable to a detail view or practice entry point.
- Empty content lists render a clear call to action to upload content.

### 20.8 `/student/quiz`
- The student can start a practice quiz from available content.
- Starting a practice quiz creates a server-backed session.
- On successful creation, the app redirects to `/quiz/[quizSessionId]`.
- If no content or questions are available, the page shows a helpful empty state instead of failing.

### 20.9 `/quiz/[quizSessionId]`
- The quiz runtime loads the session from the server before rendering the question UI.
- The timer is displayed only when the session has a server-backed time limit.
- Answer submission is accepted only while the session remains active.
- Expired sessions are locked and cannot continue accepting answers.
- On submit, the app navigates to the correct result view based on visibility rules.

### 20.10 `/student/history`
- The page lists attempts in reverse chronological order.
- Each attempt shows at minimum date, assessment or content label, and score/result summary where allowed.
- Empty history renders a clear guidance state.

### 20.11 `/student/progress`
- The page shows progress breakdowns without requiring teacher access.
- The page must not show raw system configuration or internal assessment records.
- Charts or summaries use server-sourced data.

### 20.12 `/profile`
- The page shows current saved profile values distinctly from placeholder text.
- Editable fields are clearly labeled and visually differentiated from non-editable or empty states.
- Saving updates persists the profile and keeps the user on the page or returns a clear success state.
- The page uses the shared authenticated layout shell.

### 20.13 `/settings`
- The page shows only settings applicable to the current role.
- The page allows theme/notification preference edits where implemented.
- Role switching controls appear only for authenticated users.
- Any role change action must be followed by a session refresh or re-auth flow.

### 20.14 `/dashboard`
- The teacher dashboard is accessible only to teacher/admin roles.
- The dashboard loads teacher summary data and recent assessment state.
- The page clearly surfaces the next teacher actions: create assessment, open assessments, view reports.
- A non-teacher trying to access the page receives a clear forbidden state or redirect.

### 20.15 `/teacher/assessments`
- The page lists only assessments owned by the current teacher.
- The list supports opening an assessment and creating a new one.
- The page displays status indicators such as draft, ready, published, needs material, or inactive when applicable.
- Empty state copy must direct the teacher toward creating the first assessment.

### 20.16 `/teacher/assessments/[id]`
- The page loads only if the current teacher owns the assessment or has admin access.
- The page shows the assessment title, description, config, linked content, and share state.
- A teacher can attach content, generate questions, and manage tokens from this page.
- The page must clearly show whether the assessment is ready, published, or blocked by missing setup.
- A non-owner teacher must not be able to edit another teacher’s assessment.

### 20.17 `/teacher/assessments/[id]/report`
- The report page loads only for an authorized teacher owner/admin.
- The report page shows summary metrics, student-level outcomes, and question-level summary data.
- The report page does not require CSV export to be useful.
- Empty or zero-attempt states are handled with a clear call to action.

### 20.18 `/a/[token]`
- The page resolves the token automatically on load or via a clearly labeled check action.
- Valid links show assessment title, description, and rules.
- Invalid or expired links show a clear error state and do not start an attempt.
- If `requireLogin=true`, the page blocks guest start and instructs the user to sign in.
- If `requireLogin=false`, the page allows guest start but requires a guest name.
- If the link requires an access code, the start action cannot proceed until a valid code is provided.
- A successful start redirects to the quiz runtime page using the created session id.

### 20.19 `POST /api/user/role`
- The endpoint accepts only authenticated requests.
- The request body must include a valid target role.
- The endpoint persists the role change before returning success.
- The client must not assume the current session is automatically fresh after the role update.
- After success, the UI must re-authenticate or otherwise refresh the session before teacher pages are used.

### 20.20 `GET /api/public/assessments/resolve`
- A valid token returns assessment metadata needed to render the public join page.
- An invalid, expired, or inactive token returns 404.
- The response must not include hashed access codes or any secret-only information.
- The response must include enough rule data for the UI to render the correct join state.

### 20.21 `POST /api/assessments/:id/start`
- The request must be validated against the resolved token and the requested assessment id.
- Guest mode is accepted only when `requireLogin=false`.
- Guest mode requires a non-empty guest name.
- Login-required assessments reject anonymous starts.
- Access code validation happens on the server.
- Time window validation happens on the server.
- The endpoint returns a session id only after all validations pass.
- Late starts, invalid tokens, exhausted attempts, and closed assessments are rejected with deterministic errors.

### 20.22 `GET /api/teacher/assessments/:id/link`
- The endpoint is available only to the teacher owner or admin.
- The response lists all links for the assessment.
- The endpoint does not expose access code hashes.

### 20.23 `POST /api/teacher/assessments/:id/link`
- The endpoint is available only to the teacher owner or admin.
- The endpoint creates a tokenized share link.
- The response contains a copyable public URL in the `/a/[token]` format.
- Optional access code and expiry values are persisted and validated.
- Newly created links are immediately usable unless they are configured otherwise.

### 20.24 Cross-Page and Cross-API Acceptance Rules
- Every protected page must enforce route access before sensitive data is rendered.
- Every action that creates or mutates data must have a matching server-side validation path.
- Any role-based navigation change must be reflected after session refresh.
- The same assessment must produce consistent token resolution and session creation behavior across page refreshes.
- The public join flow and the teacher share flow must point to the same canonical public path format.
