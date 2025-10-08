-- Test RLS with prisma_app role
-- Run this in Supabase SQL Editor

-- 1. Switch to prisma_app role
SET ROLE prisma_app;

-- 2. Try to query without context (should return 0)
SELECT COUNT(*) as "Without Context (Should be 0)" FROM players;

-- 3. Set tenant context
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', false);

-- 4. Verify it was set
SELECT current_setting('app.tenant_id', true) as "Current Setting";

-- 5. Try to query WITH context (should return 53)
SELECT COUNT(*) as "With Context (Should be 53)" FROM players;

-- 6. Check what the RLS policy is actually checking
SELECT 
  policyname,
  cmd,
  qual as "USING clause"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'players';

-- 7. Reset role
RESET ROLE;

-- If step 5 returns 0 even WITH context set, the RLS policy is wrong!
-- It might be checking for auth.uid() instead of app.tenant_id

