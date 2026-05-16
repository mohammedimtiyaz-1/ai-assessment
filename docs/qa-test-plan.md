# QA Test Plan - AI Assessment MVP

**Status**: Playwright MCP unavailable (transport closed). Manual testing required.

## Test Environment
- Dev server: `http://localhost:3000`
- Database: PostgreSQL with pgvector
- Seed data: `pnpm run seed:development`

## Pre-Test Setup

```bash
# 1. Start dev server
pnpm dev

# 2. Run seed data (optional, for testing)
pnpm run seed:development

# 3. Open browser to http://localhost:3000
```

---

## Test Cases

### 1. Landing Page (/)
**Priority**: High
**Steps**:
1. Navigate to `http://localhost:3000`
2. Verify hero section displays with "AI Assessment" branding
3. Verify "Get Started" button links to `/signup`
4. Verify "Sign In" button links to `/login`
5. Verify feature cards display (AI Question Generation, Adaptive Quizzes, Progress Tracking)
6. Verify animations (framer-motion) load smoothly

**Expected**: Landing page loads, all links work, animations play

---

### 2. Sign Up Flow (/signup)
**Priority**: High
**Steps**:
1. Click "Get Started" from landing page
2. Fill name: "Test Student"
3. Fill email: `student-test@example.com`
4. Fill password: `password123`
5. Click "Create account"
6. Verify redirect to `/student/dashboard`
7. Verify session is set (check browser cookies/localStorage)

**Expected**: Account created, auto-signed in, redirected to student dashboard

---

### 3. Login Flow (/login)
**Priority**: High
**Steps**:
1. Navigate to `/login`
2. Fill email: `student@example.com` (from seed data)
3. Fill password: `password123`
4. Click "Sign in"
5. Verify redirect to `/student/dashboard` (student role)

**Expected**: Login succeeds, redirects to role-appropriate dashboard

**Test with teacher role**:
1. Logout
2. Login with `teacher@example.com` / `password123`
3. Verify redirect to `/dashboard`

**Expected**: Teacher redirects to teacher dashboard

---

### 4. Role-Based Redirects (Middleware)
**Priority**: High
**Steps**:
1. Login as student
2. Try to access `/dashboard` (teacher route)
3. Verify redirect to `/student/dashboard`
4. Login as teacher
5. Try to access `/student/dashboard`
6. Verify redirect to `/dashboard`

**Expected**: Middleware enforces role-based routing

---

### 5. Student Dashboard (/student/dashboard)
**Priority**: High
**Steps**:
1. Login as student
2. Navigate to `/student/dashboard`
3. Verify KPI cards display (Content count, Attempts, Accuracy)
4. Verify "Recent content" section
5. Verify "Recent attempts" section
6. Click "Upload Content" button
7. Verify redirect to `/student/upload`

**Expected**: Dashboard loads with data, navigation works

---

### 6. Student Content Upload (/student/upload)
**Priority**: High
**Steps**:
1. Navigate to `/student/upload`
2. Verify drag-drop zone displays
3. Enter title: "Test Document"
4. Select a file (PDF, TXT, etc.)
5. Click "Upload"
6. Verify success message or redirect
7. Navigate to `/student/content`
8. Verify new content appears in list

**Expected**: Upload succeeds, content appears in library

---

### 7. Student Content Library (/student/content)
**Priority**: High
**Steps**:
1. Navigate to `/student/content`
2. Verify content cards display
3. Click content title → should go to `/student/content/[id]`
4. Click "Practice" button → should go to `/student/quiz?contentId=...`
5. Verify empty state when no content exists

**Expected**: Content list, detail view, and practice entry all work

---

### 8. Student Quiz Entry (/student/quiz)
**Priority**: High
**Steps**:
1. Navigate to `/student/quiz?contentId=...` (from content library)
2. Verify quiz entry form displays
3. Click "Start Practice"
4. Verify redirect to `/quiz/[sessionId]`
5. Verify session is created (check API response)

**Expected**: Quiz session created, redirect to runtime

---

### 9. Quiz Runtime (/quiz/[sessionId])
**Priority**: Critical
**Steps**:
1. Load quiz runtime with valid sessionId
2. Verify question displays
3. Verify timer displays (if time limit set)
4. Select an answer
5. Click "Next"
6. Navigate through all questions
7. Click "Submit"
8. Verify redirect to `/student/history`
9. Verify score is recorded

**Expected**: Quiz completes, score saved, history updated

**Test timer enforcement**:
1. Start a quiz with short time limit
2. Wait for timer to expire
3. Verify auto-submit occurs

**Expected**: Auto-submit on expiry

---

### 10. Student History (/student/history)
**Priority**: High
**Steps**:
1. Navigate to `/student/history`
2. Verify attempt history list displays
3. Verify each attempt shows score, date, content title
4. Click an attempt (if detailed view exists)

**Expected**: History loads with past attempts

---

### 11. Student Progress (/student/progress)
**Priority**: High
**Steps**:
1. Navigate to `/student/progress`
2. Verify analytics display (total attempts, avg score, completion rate)
3. Verify progress bars or charts (if implemented)

**Expected**: Progress analytics load correctly

---

### 12. Teacher Dashboard (/dashboard)
**Priority**: High
**Steps**:
1. Login as teacher
2. Navigate to `/dashboard`
3. Verify KPI cards (Assessments, Published, Attempts)
4. Verify "Recent assessments" section
5. Click "Create Assessment"
6. Verify redirect to `/teacher/assessments`

**Expected**: Teacher dashboard loads with metrics

---

### 13. Teacher Assessments (/teacher/assessments)
**Priority**: High
**Steps**:
1. Navigate to `/teacher/assessments`
2. Verify assessment list displays
3. Click "Create" button
4. Enter title in prompt
5. Verify new assessment appears in list
6. Verify status shows "draft"
7. Click assessment → should go to `/teacher/assessments/[id]`

**Expected**: Can create and list assessments

---

### 14. Assessment Detail (/teacher/assessments/[id])
**Priority**: High
**Steps**:
1. Load assessment detail page
2. Verify title, description, status display
3. Click "Generate new link"
4. Verify new share link appears
5. Click "View report"
6. Verify redirect to `/teacher/assessments/[id]/report`

**Expected**: Assessment details, link generation, report access work

---

### 15. Assessment Report (/teacher/assessments/[id]/report)
**Priority**: High
**Steps**:
1. Load report page
2. Verify overall stats (total attempts, completions, avg score)
3. Verify individual student results list
4. Verify scores and dates display

**Expected**: Report loads with student results

---

### 16. Public Link Flow (/a/[token])
**Priority**: Critical
**Steps**:
1. Generate a share link from teacher assessment detail
2. Open the `/a/[token]` URL in incognito/private window
3. Verify assessment details display
4. If requireLogin is true → should redirect to login
5. If requireLogin is false → should allow guest entry
6. If access code required → verify code prompt
7. Enter access code (if required)
8. Click "Start Assessment"
9. Verify redirect to `/quiz/[sessionId]`

**Expected**: Public link resolves, auth/code checks work

---

### 17. Profile Page (/profile)
**Priority**: Medium
**Steps**:
1. Login as any user
2. Navigate to `/profile`
3. Verify name and email display
4. Edit name field
5. Click "Save"
6. Verify success message
7. Refresh and verify name persists

**Expected**: Profile updates persist

---

### 18. Settings Page (/settings)
**Priority**: Medium
**Steps**:
1. Navigate to `/settings`
2. Verify current role displays
3. If student → verify "Upgrade to Teacher" button
4. Click upgrade → should prompt or redirect

**Expected**: Settings page loads, role upgrade flow works

---

### 19. Forgot Password (/forgot-password)
**Priority**: Low
**Steps**:
1. Navigate to `/forgot-password`
2. Enter email
3. Click "Send reset link"
4. Verify success message displays
5. Note: Actual email sending is not implemented in MVP

**Expected**: UI flow works (email not sent in MVP)

---

### 20. Not Found (404)
**Priority**: Low
**Steps**:
1. Navigate to `/non-existent-page`
2. Verify custom 404 page displays
3. Click "Go home" button
4. Verify redirect to `/`

**Expected**: Custom 404 page loads

---

### 21. Health Check (/api/health)
**Priority**: High
**Steps**:
1. `curl http://localhost:3000/api/health`
2. Verify response: `{"status":"ok","timestamp":"..."}`

**Expected**: Health endpoint returns 200 with status

---

### 22. Error Boundary
**Priority**: Medium
**Steps**:
1. Intentionally trigger an error (e.g., malformed API call)
2. Verify error boundary displays
3. Click "Try again"
4. Verify page reloads

**Expected**: Error boundary catches and displays gracefully

---

## API Endpoint Tests

### POST /api/auth/register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"new-user@example.com","password":"password123","name":"New User"}'
```
Expected: `{"success":true}` with 201 status

### POST /api/auth/register (rate limit)
```bash
# Run 6 times rapidly
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"rate-test-$i@example.com\",\"password\":\"password123\"}"
done
```
Expected: First 5 succeed, 6th returns 429 with retry-after header

### GET /api/student/dashboard
```bash
curl http://localhost:3000/api/student/dashboard \
  -H "Cookie: next-auth.session-token=..."
```
Expected: Returns dashboard data (requires auth)

### POST /api/teacher/assessments
```bash
curl -X POST http://localhost:3000/api/teacher/assessments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"title":"Test Assessment"}'
```
Expected: Returns `{"id":"...","title":"...","status":"draft"}`

### GET /api/health
```bash
curl http://localhost:3000/api/health
```
Expected: `{"status":"ok","timestamp":"..."}`

---

## Known Limitations (MVP)

1. **Forgot Password**: UI exists but email sending not implemented
2. **File Upload**: Storage is mock (s3:// URLs), actual file not stored
3. **AI Question Generation**: Not implemented in MVP (questions seeded manually)
4. **Rate Limiting**: In-memory only (resets on server restart)

---

## Bugs Found During Testing

*To be populated during testing*

---

## Test Results Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| Landing Page | ⏳ | - |
| Sign Up | ⏳ | - |
| Login | ⏳ | - |
| Role Redirects | ⏳ | - |
| Student Dashboard | ⏳ | - |
| Content Upload | ⏳ | - |
| Content Library | ⏳ | - |
| Quiz Entry | ⏳ | - |
| Quiz Runtime | ⏳ | - |
| History | ⏳ | - |
| Progress | ⏳ | - |
| Teacher Dashboard | ⏳ | - |
| Teacher Assessments | ⏳ | - |
| Assessment Detail | ⏳ | - |
| Assessment Report | ⏳ | - |
| Public Link | ⏳ | - |
| Profile | ⏳ | - |
| Settings | ⏳ | - |
| Forgot Password | ⏳ | - |
| Not Found | ⏳ | - |
| Health Check | ⏳ | - |
| Error Boundary | ⏳ | - |
