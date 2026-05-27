# Security Review

**Status**: Initial release hardening pass complete.  
**Scope**: Auth, roles, public links, secrets, validation, database access, logging, dependencies.

## Findings

| Area | Status | Notes |
| --- | --- | --- |
| Secrets | Needs environment review | `.env.example` now documents Supabase variables. Production must use provider-managed secrets. |
| Auth | Needs deeper review | Server routes use shared auth helpers in many places, but callback typing and route coverage should be improved later. |
| RBAC | Needs E2E verification | Role-based flows exist, but full browser validation needs a seeded staging/test Supabase environment. |
| Public links | Needs E2E verification | Expiry, active state, access code, and login requirements should be covered by staging E2E. |
| SQL/database | Partially mitigated | Migrations are scripted. Current runtime uses Supabase client APIs rather than direct SQL in many routes. |
| Logging | Partially mitigated | Structured logger exists. Continue replacing debug output and avoid logging uploaded content, tokens, or access codes. |
| Dependencies | Blocked | `pnpm audit` found 40 vulnerabilities: 19 high, 16 moderate, 5 low. |
| Rate limiting | Known MVP limitation | In-memory rate limiting is not suitable for horizontally scaled production. Use Redis or provider-level controls. |

## Required Before Production

1. Resolve or formally accept audit findings before public production release:
   - `next@14.2.35` has multiple advisories; patched ranges reported by audit are currently Next 15.x.
   - `glob` advisories appear through `eslint-config-next` and `node-pg-migrate`.
   - `tar`, `ai`, `qs`, and `uuid` advisories appear through Mastra, NextAuth, and related transitive dependencies.
2. Verify all protected API routes enforce server-side role checks.
3. Verify public assessment links reject expired, inactive, invalid-token, missing-code, and login-required cases.
4. Confirm production logs do not include secrets, tokens, access codes, passwords, or raw uploaded content.
5. Configure production-grade rate limiting for auth, public-link start, and AI generation endpoints.

## Accepted MVP Risks

- `/api/debug/auth` is now disabled in production, but should still be removed entirely before a public launch if it is no longer needed.
- Full security monitoring provider is not wired in code yet.
- E2E security validation depends on a dedicated staging/test Supabase project.
- Coverage exists but does not yet enforce a numeric threshold.
