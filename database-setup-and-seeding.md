# Database Setup, Migrations, and Seeding Playbook

Authoritative guide for setting up PostgreSQL, running migrations, and seeding initial data for the AI Tutor project.

## 1) Prerequisites
- PostgreSQL 14+ (local or managed)
- Node.js >= 18.17
- pnpm 9+
- Optional: Docker (for local Postgres)

## 2) Environment Variables (DB-related)
Define these in `.env.local` (copy from `.env.example` and fill real values):

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/ai_tutor
NODE_ENV=development
LOG_LEVEL=info
```

Notes:
- Use a distinct database per environment (ai_tutor_dev, ai_tutor_stg, ai_tutor_prod).
- Set `NEXTAUTH_URL`, `NEXTAUTH_SECRET` separately for auth.

## 3) Local Postgres (Option A: Docker)
```bash
# Start a local Postgres
docker run --name ai-tutor-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15

# Create DB (inside container)
docker exec -it ai-tutor-postgres psql -U postgres -c "CREATE DATABASE ai_tutor;"
```

## 4) Local Postgres (Option B: Native)
```bash
# Create DB
createdb ai_tutor
```

## 5) Enable pgvector (if used by migrations)
Make sure the `pgvector` extension exists in your database (requires superuser or appropriate privileges):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Run this via psql:
```bash
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## 6) Migrations (node-pg-migrate)
This repo uses `node-pg-migrate` with scripts in `package.json`.

Common commands:
```bash
# Create a new migration (prompts for a name)
pnpm migrate:create

# Apply all pending migrations (up)
pnpm migrate:up

# Roll back last migration (down)
pnpm migrate:down

# Reset DB (dangerous: full down then up)
pnpm migrate:reset
```

Migration files live in `migrations/`. Prefer SQL migrations for clarity and reviewability. Keep changes small and additive.

## 7) Expected Core Schema (per MVP SRS)
Use/extend the following tables (exact columns may differ based on existing migrations):
- `users` — id, email (unique), password_hash, role, created_at, updated_at
- `content` — id, owner_user_id (fk users), title, type, storage_ref, created_at
- `assessments` — id, owner_user_id, title, description, config_json, created_at, updated_at
- `assessment_links` — id, assessment_id (fk), token (unique), access_code_hash, expiry_at, active, created_at
- `questions` — id, source_content_id (fk), body, answers_json, correct_answer_key, difficulty, created_at
- `assessment_questions` — assessment_id, question_id, position
- `quiz_sessions` — id, user_id NULLABLE (for guests), guest_name, assessment_id, constraints_json, started_at, finished_at, score
- `quiz_answers` — session_id, question_id, answer_key, is_correct, answered_at

Notes:
- Keep tokens unique and non-guessable.
- Never store raw access codes; store a salted hash only.
- Snapshot constraints at session start (time limit, visibility, etc.).

## 8) Seeding Strategy
Package scripts reference seed commands, e.g. `scripts/seed-development.js`. Add minimal seeders for dev/testing.

### 8.1 Seed Script Locations
- `scripts/seed-development.js`
- `scripts/seed-staging.js`
- `scripts/seed-production.js` (use with caution)

### 8.2 Running Seeds
```bash
# After migrations
pnpm migrate:up

# Run development seed
yarn node scripts/seed-development.js
# OR
pnpm run seed:development
```

### 8.3 Example: scripts/seed-development.js (template)
```js
// scripts/seed-development.js
// Purpose: create a test user and a small set of content/assessments for local development.

import bcrypt from 'bcrypt';
import { Client } from 'pg';
import { randomUUID } from 'crypto';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // 1) Create a student user (if not exists)
    const email = 'student@example.com';
    const passwordHash = await bcrypt.hash('password123', 10);
    const role = 'student';

    const userRes = await client.query(
      `INSERT INTO users (id, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id;`,
      [randomUUID(), email, passwordHash, role]
    );
    const studentId = userRes.rows[0].id;

    // 2) Optional: create a teacher user
    const tEmail = 'teacher@example.com';
    const tHash = await bcrypt.hash('password123', 10);
    await client.query(
      `INSERT INTO users (id, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email;`,
      [randomUUID(), tEmail, tHash, 'teacher']
    );

    // 3) Seed sample content for the student
    const contentRes = await client.query(
      `INSERT INTO content (id, owner_user_id, title, type, storage_ref)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id;`,
      [randomUUID(), studentId, 'Biology 101 - Cell Structure', 'pdf', 's3://dev/biology-101.pdf']
    );
    const contentId = contentRes.rows[0]?.id;

    // 4) Seed an assessment owned by teacher
    const assessRes = await client.query(
      `INSERT INTO assessments (id, owner_user_id, title, description, config_json)
       VALUES ($1, (SELECT id FROM users WHERE email=$2), $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id;`,
      [randomUUID(), tEmail, 'Biology Quiz A', 'Intro quiz', JSON.stringify({
        questionCount: 10,
        difficulty: 'mixed',
        formats: ['mcq'],
        timeLimitSec: 900,
        resultVisibility: 'immediate_full',
        requireLogin: true
      })]
    );
    const assessmentId = assessRes.rows[0]?.id;

    // 5) Optional: create a share link
    if (assessmentId) {
      const token = randomUUID().replace(/-/g, '');
      await client.query(
        `INSERT INTO assessment_links (id, assessment_id, token, active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT DO NOTHING;`,
        [randomUUID(), assessmentId, token]
      );
    }

    console.log('Seed complete');
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

Notes:
- Ensure your schema matches the INSERT columns; adjust as needed.
- Never run development seeds against production.

## 9) Manual SQL Seeding (Alternative)
```sql
-- Example: create a student user manually (adjust for your schema)
INSERT INTO users (id, email, password_hash, role)
VALUES (
  gen_random_uuid(),
  'student@example.com',
  '$2b$10$H4SHEDPASSW0RDGENERATEDBYBCRYPT', -- replace with real bcrypt hash
  'student'
) ON CONFLICT (email) DO NOTHING;
```
Generate a bcrypt hash using a local script or Node REPL:
```js
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash('password123', 10);
console.log(hash);
```

## 10) Running Order (Local)
```bash
# 1. Install deps
pnpm install

# 2. Set env (.env.local)
cp .env.example .env.local  # then edit values

# 3. Prepare DB & extension
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;" || true

# 4. Apply migrations
pnpm migrate:up

# 5. (Optional) Seed development data
pnpm run seed:development

# 6. Start app
pnpm dev
```

## 11) Rollback & Reset
```bash
# Roll back last migration
pnpm migrate:down

# Reset (dangerous, wipes data)
pnpm migrate:reset
```

## 12) Data Integrity & Security
- Tokens must be unique and non-guessable.
- Access codes must be hashed server-side; never store plaintext.
- Enforce row-level ownership checks in repositories/services.
- Keep prod `DATABASE_URL` secret; never commit .env.local.

## 13) Troubleshooting
- Connection refused: verify Postgres is running and `DATABASE_URL` host/port.
- SSL errors: add `?sslmode=require` (managed DBs) or configure SSL in client.
- Extension missing: run `CREATE EXTENSION IF NOT EXISTS vector;` with superuser.
- Migrations out of order: ensure team runs `pnpm migrate:up` before coding.
- Duplicate key/token: ensure unique indexes (e.g., token UNIQUE).

## 14) Production Checklist
- Managed Postgres provisioned
- `pgvector` available if required
- Migrations applied in CI/CD before app deploy
- DB credentials rotated and stored in secrets manager
- Backups & retention configured
- Monitoring/alerts in place

---

References:
- SRS: `docs/requirements/refreshed-requirments.md`
- Technical Plan: `docs/requirements/refresh-technical-details.md`
- Migrations: `migrations/`
- Seed scripts (to add): `scripts/seed-development.js`, `scripts/seed-staging.js`, `scripts/seed-production.js`
