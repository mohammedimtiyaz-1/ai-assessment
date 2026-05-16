# Architecture Decisions

This document records key architectural decisions made during the development of the AI Assessment platform.

## Repository Pattern Decision

### Decision
**We have decided to proceed with direct database query approach instead of implementing a repository pattern.**

### Context
The original technical plan (Phase 0) called for implementing repository modules under `src/modules/**` to abstract database operations. After auditing the existing codebase and considering the project timeline and complexity, we made an intentional deviation from this plan.

### Rationale

#### Pros of Direct Query Approach
1. **Simplicity**: Direct queries are easier to understand and debug for the team
2. **Faster Development**: No need to build and maintain additional abstraction layers
3. **Consistency**: The existing codebase already uses direct queries throughout
4. **Type Safety**: TypeScript provides adequate type safety without additional abstraction
5. **Performance**: One less layer of indirection means less overhead
6. **Maintainability**: Fewer files and abstractions to maintain

#### Cons of Direct Query Approach
1. **Tight Coupling**: Business logic is coupled to database schema
2. **Testing**: Harder to mock database operations in tests
3. **Flexibility**: Changing database schema requires updating queries in multiple places

#### Why Repository Pattern Was Not Implemented
1. **Project Scope**: This is an MVP with a relatively simple data model
2. **Team Familiarity**: The team is more familiar with direct SQL queries
3. **Time Constraints**: Implementing a full repository pattern would add significant development time
4. **Overhead**: For the current complexity, the repository pattern would add more overhead than benefit

### Mitigation Strategies
To address the downsides of direct queries:

1. **Centralized Query Function**: All database operations go through the `query()` function in `src/lib/db.ts`
2. **Type Definitions**: TypeScript interfaces define the shape of database results
3. **SQL Validation**: Use parameterized queries to prevent SQL injection
4. **Migration Management**: Database schema changes are tracked via migration files
5. **Code Review**: Strict review process for any database-related changes

### Future Considerations
If the project grows in complexity, we may reconsider this decision. Signs that would trigger a move to repository pattern:
- Database queries become complex and duplicated across the codebase
- Need to support multiple database backends
- Testing becomes difficult due to tight coupling
- Business logic becomes obscured by SQL

### Related Files
- `src/lib/db.ts` - Centralized database query function
- `migrations/` - Database schema migrations
- SQL queries are scattered across API routes in `src/app/api/`

### Decision Date
2026-05-16

### Decision Maker
Development team consensus during Phase 0 audit

---

## Authentication Strategy

### Decision
**Using NextAuth.js with JWT strategy for authentication and session management.**

### Rationale
- NextAuth.js provides a complete authentication solution with built-in security features
- JWT strategy allows stateless authentication, suitable for serverless deployment
- Supports multiple providers (credentials, OAuth) for future flexibility
- Built-in session management with configurable expiration

### Security Measures Implemented
- Password hashing with bcrypt (cost factor 12)
- Rate limiting on authentication endpoints
- Role-based access control in middleware
- Session timeout (30 days with 24-hour refresh)
- Secure cookie configuration (httpOnly, secure in production)

---

## API Route Structure

### Decision
**Using Next.js App Router API routes with direct database access.**

### Rationale
- Native Next.js API routes provide serverless functions
- Direct database access keeps the architecture simple
- API routes are co-located with their related pages for better organization
- Built-in support for middleware and edge functions

---

## State Management

### Decision
**Using React hooks (useState, useEffect) and NextAuth session provider for client state.**

### Rationale
- No external state management library needed for current complexity
- NextAuth session provider handles authentication state
- Local component state is sufficient for most UI interactions
- Server components reduce client-side state requirements

---

## Styling Strategy

### Decision
**Using Tailwind CSS with shadcn/ui components.**

### Rationale
- Utility-first CSS allows rapid UI development
- shadcn/ui provides pre-built, accessible components
- Consistent design system across the application
- Easy customization through Tailwind configuration
