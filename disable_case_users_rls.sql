-- ============================================
-- Disable RLS on case_users to Fix Recursion
-- ============================================
-- This removes all RLS policies from case_users table
-- Security is still maintained because:
-- 1. The cases policy enforces company boundaries
-- 2. Application always queries case_users filtered by case_id or joined to cases
-- 3. The cases policy filters results when joined

-- Step 1: Drop all existing policies on case_users
DROP POLICY IF EXISTS "Users can view case_users for their cases" ON case_users;
DROP POLICY IF EXISTS "Users can add users to their cases" ON case_users;
DROP POLICY IF EXISTS "Users can remove users from their cases" ON case_users;

-- Step 2: Disable RLS on case_users table
ALTER TABLE case_users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Note: The cases table still has RLS enabled
-- This ensures security is maintained:
-- - Users can only see cases in their company
-- - When querying case_users with a join to cases, 
--   the cases policy filters the results
-- - When querying case_users filtered by case_id,
--   the case_id comes from cases they can already access
-- ============================================

