-- ============================================
-- Quick Fix for Infinite Recursion in case_users
-- ============================================
-- Run this AFTER the main migration to fix the recursion issue
-- This updates the policies to avoid circular dependencies

-- Drop and recreate the helper function with proper permissions
DROP FUNCTION IF EXISTS is_user_on_case(UUID, UUID);
CREATE OR REPLACE FUNCTION is_user_on_case(p_case_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- SECURITY DEFINER allows this to bypass RLS
  -- The function runs with the privileges of the function creator (postgres/superuser)
  RETURN EXISTS (
    SELECT 1 FROM case_users
    WHERE case_id = p_case_id
    AND user_id = p_user_id
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_user_on_case(UUID, UUID) TO authenticated;

-- Update cases SELECT policy to check company first (avoids recursion)
DROP POLICY IF EXISTS "Users can view cases they're part of" ON cases;
CREATE POLICY "Users can view cases they're part of"
  ON cases FOR SELECT
  USING (
    -- First check: Case is in user's company (this doesn't query case_users)
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.company_id = cases.company_id
    )
    AND (
      -- User is the creator (simple check, no recursion)
      user_id = auth.uid()
      -- OR user is on the case (function bypasses RLS, no recursion)
      OR is_user_on_case(cases.id, auth.uid())
    )
  );

-- Update case_users SELECT policy - avoid querying cases table to prevent recursion
-- Option 1: Allow users to see case_users rows where they're the user_id OR where
-- the case_id matches cases they can access (but we can't check cases without recursion)
-- 
-- Option 2: Use a simpler approach - allow if user_id matches (they're on the case)
-- OR use a function that checks company without triggering cases policy
--
-- Option 3: Store company_id in case_users (requires schema change)
--
-- For now, let's use Option 2 with a helper function that checks company via cases
-- but uses SECURITY DEFINER to avoid recursion

-- Create a helper function to check if case is in user's company (bypasses RLS)
CREATE OR REPLACE FUNCTION is_case_in_user_company(p_case_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM cases c
    JOIN user_profiles up ON up.id = p_user_id
    WHERE c.id = p_case_id
    AND c.company_id = up.company_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_case_in_user_company(UUID, UUID) TO authenticated;

-- Update case_users SELECT policy - use function to avoid recursion
DROP POLICY IF EXISTS "Users can view case_users for their cases" ON case_users;
CREATE POLICY "Users can view case_users for their cases"
  ON case_users FOR SELECT
  USING (
    -- User is the user_id in this row (they're on the case)
    user_id = auth.uid()
    -- OR case is in their company (checked via function that bypasses RLS)
    OR is_case_in_user_company(case_users.case_id, auth.uid())
  );

-- Alternative: If you want stricter control, allow users to see case_users rows
-- only if they're the user_id in that row OR the case is in their company
-- This is more restrictive but still avoids recursion
-- Uncomment below and comment out above if you want this stricter version:
/*
DROP POLICY IF EXISTS "Users can view case_users for their cases" ON case_users;
CREATE POLICY "Users can view case_users for their cases"
  ON case_users FOR SELECT
  USING (
    -- User is the user_id in this row (they're on the case)
    user_id = auth.uid()
    -- OR case is in their company (they can see who's on cases in their company)
    OR EXISTS (
      SELECT 1 FROM cases c
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE c.id = case_users.case_id
      AND c.company_id = up.company_id
    )
  );
*/

