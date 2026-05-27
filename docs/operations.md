# Operations Runbook

## Health Checks

Monitor:

```text
GET /api/health
```

Expected response:

```json
{"status":"ok","timestamp":"..."}
```

The health response must not expose secrets or database connection strings.

## Alerts

Configure alerts for:

- App health check failing for 2 consecutive checks.
- Elevated `5xx` rate.
- Database unavailable or connection pool exhausted.
- Authentication failures spiking.
- Quiz start or submit failures spiking.
- AI question generation failures spiking.

## Logs

Use structured logs from `src/lib/logger.ts`. Production logs may include user IDs and route names, but should not include:

- Passwords
- Access codes
- Session tokens
- API keys
- Raw uploaded study material
- Full generated question payloads unless explicitly needed for a debug incident

## First Response Checklist

1. Check `/api/health`.
2. Check hosting provider deployment status.
3. Check database status and connection count.
4. Check recent application errors.
5. Check whether a recent deployment or migration occurred.
6. If user-facing flows are broken, roll back the app deployment first.
7. If database migration is suspected, restore or roll forward only after confirming backup state.

## Backup And Restore

Before production migrations:

1. Confirm the latest automated backup completed.
2. Take a manual backup when the provider supports it.
3. Record backup ID or timestamp in release notes.

Restore process:

1. Restore into staging first when possible.
2. Verify schema and key flows.
3. Restore production only after sign-off.

## Staging Smoke Command List

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm test:e2e
```

E2E requires a seeded staging/test environment with Supabase credentials configured.
