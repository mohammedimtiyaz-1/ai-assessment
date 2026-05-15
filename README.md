# AI Assessment MVP

AI-powered learning and assessment platform built with Next.js 14, Tailwind CSS, Shadcn/UI, NextAuth v5, and PostgreSQL.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS, Shadcn/Radix UI primitives
- **Auth**: NextAuth v5 (Credentials + JWT)
- **Database**: PostgreSQL + `pg` + `node-pg-migrate`
- **Validation**: Zod
- **Logging**: Pino
- **Tests**: Vitest

## Prerequisites

- Node.js >= 18.17
- pnpm 9+
- PostgreSQL 14+ with `pgvector` extension

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres (optional — skip if you have one)
docker compose up -d

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL, NEXTAUTH_SECRET, etc.

# 4. Run migrations
pnpm migrate:up

# 5. (Optional) Seed dev data
pnpm run seed:development

# 6. Start dev server
pnpm dev
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm migrate:up` | Apply DB migrations |
| `pnpm migrate:down` | Rollback last migration |
| `pnpm run seed:development` | Seed dev data |
| `pnpm test` | Run tests |

## Features

- **Auth**: Sign up, sign in, forgot password, role-based access
- **Student**: Upload content, practice quizzes, track progress, view history
- **Teacher**: Create assessments, generate share links, view reports
- **Public Links**: `/a/[token]` guest access with optional access codes
- **Server Enforcement**: Time limits, attempt limits, availability windows

## Roles

- `student` — self-assessment flow
- `teacher` / `admin` / `super_admin` — assessment creation and reporting

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page |
| `/login`, `/signup`, `/forgot-password` | Public | Auth |
| `/student/*` | Student | Dashboard, upload, content, quiz, history, progress |
| `/dashboard`, `/teacher/*` | Teacher | Dashboard, assessments, reports |
| `/profile`, `/settings` | Authenticated | Profile, role upgrade |
| `/a/[token]` | Public | Assessment entry via share link |
| `/quiz/[sessionId]` | Student/Guest | Active quiz runtime |

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=min-32-char-secret
OPENAI_API_KEY=sk-...
NODE_ENV=development
LOG_LEVEL=info
```

## License

Private
