-- Debug: Check current auth state for user 07949251277
-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check auth.users for this phone number
SELECT 
  id as auth_user_id,
  phone,
  created_at,
  last_sign_in_at,
  phone_confirmed_at
FROM auth.users
WHERE phone LIKE '%949251277%'
ORDER BY created_at DESC;

-- 2. Check players table for this phone
SELECT 
  player_id,
  name,
  phone,
  tenant_id,
  auth_user_id,
  is_admin,
  (SELECT name FROM tenants WHERE tenant_id = players.tenant_id) as club_name
FROM players
WHERE phone IN ('07949251277', '+447949251277', '447949251277')
   OR phone LIKE '%949251277%'
ORDER BY player_id;

-- 3. If the above shows a player WITHOUT auth_user_id, manually link it
-- (Replace with actual values from queries above)
/*
UPDATE players
SET auth_user_id = '9cd1e822-460e-4324-ae91-907da7ad26be'  -- From query 1
WHERE phone LIKE '%949251277%'
  AND auth_user_id IS NULL;
*/

-- 4. Verify the link worked
SELECT 
  p.player_id,
  p.name,
  p.phone,
  p.auth_user_id,
  p.is_admin,
  au.phone as auth_phone,
  (SELECT name FROM tenants WHERE tenant_id = p.tenant_id) as club_name
FROM players p
LEFT JOIN auth.users au ON p.auth_user_id = au.id
WHERE p.phone LIKE '%949251277%';

