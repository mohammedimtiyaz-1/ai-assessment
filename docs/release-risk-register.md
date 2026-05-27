# Release Risk Register

**Project**: AI Assessment MVP  
**Created**: 2026-05-24  
**Status**: Active

## Critical Issues

| ID | Issue | Impact | Status | Owner |
|----|-------|--------|--------|-------|
| R001 | ESLint config incompatible with Next.js 14 | Blocks linting in CI | Resolved | Agent |
| R002 | 35 TypeScript errors from Supabase migration | Blocks typecheck in CI | Resolved | Agent |
| R003 | Missing `typecheck` script | No type safety gate | Resolved | Agent |
| R004 | Missing `test:coverage` script | No coverage visibility | Resolved | Agent |
| R005 | Debug console.log in API routes | Production logging issues | Open | Agent |
| R006 | `pnpm audit` reports 40 vulnerabilities, including 19 high | Blocks public production release | Open | Agent |

## High Priority Issues

| ID | Issue | Impact | Status | Owner |
|----|-------|--------|--------|-------|
| H001 | E2E tests require manual app startup | Blocks CI automation | Resolved | Agent |
| H002 | No deterministic test database setup | Flaky E2E tests | Open | Agent |
| H003 | Missing security review | Unknown security posture | Initial Review Added | Agent |
| H004 | No deployment documentation | Blocks production deployment | Resolved | Agent |

## Medium Priority Issues

| ID | Issue | Impact | Status | Owner |
|----|-------|--------|--------|-------|
| M001 | Stale test artifacts in git | Repo hygiene | Resolved | Agent |
| M002 | Missing production monitoring | Reduced observability | Runbook Added | Agent |

## Low Priority Issues

| ID | Issue | Impact | Status | Owner |
|----|-------|--------|--------|-------|
| L001 | No error tracking integration | Slower debugging | Open | Agent |

## Notes

- Phase A triage completed: Identified 5 critical, 4 high, 2 medium, 1 low priority issues
- Execution order adjusted to address critical blocking issues first (D → E → B → G → C → F → H → J)
- Lint, typecheck, unit tests, coverage, and build gates are now runnable locally
- E2E is configured to auto-start the app but still requires dedicated Supabase test credentials/data
