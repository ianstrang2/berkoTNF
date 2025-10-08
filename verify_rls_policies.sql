-- Verify RLS Policies Are Correct
-- Run this in Supabase SQL Editor

-- 1. Check if RLS is enabled on players table
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled?"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'players';

-- Expected: rowsecurity = true

-- 2. List all RLS policies on players table
SELECT 
  policyname,
  cmd as "Command",
  qual as "USING Expression",
  with_check as "WITH CHECK Expression"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'players';

-- 3. Test if middleware pattern works (as prisma_app role)
SET ROLE prisma_app;

-- Try without context (should return 0)
SELECT COUNT(*) as "Without Context" FROM players;

-- Set context
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', true);

-- Try with context (should return 82)
SELECT COUNT(*) as "With Context (Should Be 82)" FROM players;

-- Verify context is set
SELECT current_setting('app.tenant_id', true) as "Current Tenant Context";

-- Reset role
RESET ROLE;

