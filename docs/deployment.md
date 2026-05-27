# Deployment Guide

This guide describes the repeatable release path for the AI Assessment MVP.

## Required Environment

- Node.js 20
- pnpm 9
- PostgreSQL-compatible database for migrations
- Supabase project for server/API data access
- OpenAI API key for question generation

Required app runtime variables:

```env
NEXTAUTH_URL=https://your-production-domain.example
NEXTAUTH_SECRET=minimum-32-character-secret
OPENAI_API_KEY=sk-... # Required for AI generation. Build can complete without it.
NODE_ENV=production
LOG_LEVEL=info
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

> **Important:** `SUPABASE_SERVICE_ROLE_KEY` is **mandatory** for registration and other admin APIs. Deployments without this key configured will return `503 Registration temporarily unavailable` rather than silently falling back to the anon key.

Migration jobs also require:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB
```

## Release Gates

Run these before promoting a release:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

Run E2E against a dedicated test/staging Supabase project:

```bash
pnpm test:e2e
```

## Database Migration Procedure

1. Confirm `DATABASE_URL` points at the target environment.
2. Take a database backup.
3. Run:
   ```bash
   pnpm migrate:up
   ```
4. Verify the app health endpoint:
   ```bash
   curl https://your-production-domain.example/api/health
   ```
5. Run smoke tests from this document.

Do not run development seeds against production.

## Deployment Steps

1. Install dependencies:
   ```bash
   pnpm install --frozen-lockfile
   ```
2. Run release gates.
3. Run migrations against the target database.
4. Build:
   ```bash
   pnpm build
   ```
5. Start:
   ```bash
   pnpm start
   ```

For Vercel or another managed Next.js host, configure the same environment variables in the provider dashboard and run migrations as a separate release step before traffic promotion.

## Smoke Tests

- `GET /api/health` returns `200`.
- Landing page loads.
- Signup and login work.
- Student dashboard loads.
- Teacher dashboard loads.
- A public assessment link resolves.
- A quiz can be started and submitted in staging.

## Rollback

Preferred rollback is application-only:

1. Re-deploy the previous app version.
2. Verify `/api/health`.
3. Run smoke tests.

Database rollback is allowed only when:

- The migration has a tested `down` path.
- A backup exists.
- The rollback has been tested in staging.

If a migration is not safely reversible, prefer a forward fix.
