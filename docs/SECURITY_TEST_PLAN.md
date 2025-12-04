You are acting as a senior security reviewer for a Supabase + TypeScript/Node app with multi-tenant data.

**Context / Architecture**

- I’m using Supabase with Postgres.
- For multi-tenancy, I **disabled RLS** on most operational tables due to connection pooling issues with RLS/session context.
- Instead, I enforce tenant isolation at the **application layer** via:
  - A `withTenantContext` wrapper around API routes
  - A `withTenantFilter()` (or similar) helper that always injects `tenant_id = currentTenantId` into queries
- Clients are supposed to go **only through my API**, not directly to PostgREST for those RLS-disabled tables.
- Cursor has already pointed out that I have:
  - `rls_disabled_in_public` warnings (by design)
  - Orphaned RLS policies that I’m cleaning up
  - A view that I’m recreating with `security_invoker = true`

**What I’m worried about**

My method of working could be risky if either of these happens:

A. A developer (including future me) writes a DB query that **does NOT go through** `withTenantFilter()` / `withTenantContext`, and therefore accidentally returns data across tenants.

B. There is any path where a client (using the anon key) can **hit a RLS-disabled table directly** via PostgREST or any other route, bypassing my API completely.

I’m close to release and I **do not want to refactor auth/RLS right now**, but I want maximum safety checks around this pattern.

**What I want you to do**

1. **Confirm my assumptions / risks**

   - Based on the code in this repo, confirm whether risk (A) and/or (B) are actually possible.
   - Specifically:
     - Are there any Supabase/PostgREST calls that bypass my `withTenantContext` / `withTenantFilter()` flow?
     - Is the anon key used anywhere in frontend code to talk directly to RLS-disabled tables?

2. **Verify that I consistently do X and Y**

   - X: All tenant-sensitive queries **go through a single access pattern**, e.g. a DB helper or repository that enforces `tenant_id` automatically (such as `withTenantFilter()` / `withTenantContext`).
   - Y: The **public/anon client cannot directly query** the RLS-disabled tables (only the service_role or backend code can).

   Please:
   - Scan the codebase for DB access patterns (`supabase.from`, `createClient`, raw SQL, etc.).
   - List any places that look like they might:
     - Not apply tenant filtering, or
     - Use the wrong client (anon vs service role), or
     - Talk directly to PostgREST endpoints.

3. **Design automated checks (tests + scripts)**

   I want something I can run regularly (in CI or a cron job) that tells me if I’ve accidentally introduced a leakage.

   Please:
   - Propose **concrete tests** (e.g. Jest/Vitest) that:
     - Create data for two tenants (tenant A and tenant B).
     - Authenticate as a user from tenant A.
     - Hit my real API endpoints.
     - Assert that responses only contain tenant A’s data and never tenant B’s.
   - Write example test code for:
     - One “typical” read endpoint.
     - One “dangerous” endpoint (where leakage would be worst if it happened).
   - Propose **static checks**:
     - A small Node/TS script that:
       - Walks the repo,
       - Finds all calls to Supabase / PostgREST,
       - Fails if it finds any call outside my approved DB helpers.
     - Implement that script (or at least a strong starting point) so I can run it in CI or as a cron job.
     - For example: fail CI if `supabase.from(` appears outside of `db/` or outside certain files, or if `tenant_id` is manually interpolated instead of going through `withTenantFilter()`.

4. **Hardening suggestions (without a big refactor)**

   Given that I’m keeping this architecture for now, suggest the **highest impact / lowest refactor** changes I can make in this repo, such as:
   - Centralizing all DB access in a single module.
   - Wrapping Supabase clients in a type-safe “tenant-aware client”.
   - Tightening permissions (e.g. which roles can access which tables/views) consistent with this app-layer-tenancy approach.

Where possible, please:
- Point at specific files/lines in this repo that need changes.
- Provide ready-to-paste code for the tests and the static checking script.
- Treat this as “I need to ship in 1–2 weeks; help me put guardrails around my current approach rather than redesigning it.”
