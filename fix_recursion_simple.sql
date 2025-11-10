-- ============================================
-- SIMPLE Fix for Infinite Recursion in case_users
-- ============================================
-- This is the simplest fix - just allow users to see case_users rows
-- where they are the user_id. This avoids all recursion issues.

-- Drop and recreate helper functions with proper permissions
DROP FUNCTION IF EXISTS is_user_on_case(UUID, UUID);
CREATE OR REPLACE FUNCTION is_user_on_case(p_case_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM case_users
    WHERE case_id = p_case_id
    AND user_id = p_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_user_on_case(UUID, UUID) TO authenticated;

-- Update cases SELECT policy
DROP POLICY IF EXISTS "Users can view cases they're part of" ON cases;
CREATE POLICY "Users can view cases they're part of"
  ON cases FOR SELECT
  USING (
    -- Case is in user's company
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.company_id = cases.company_id
    )
    AND (
      -- User is the creator
      user_id = auth.uid()
      -- OR user is on the case (checked via function)
      OR is_user_on_case(cases.id, auth.uid())
    )
  );

-- SIMPLEST FIX: case_users SELECT policy - only show rows where user is the user_id
-- This avoids all recursion because we're not querying cases or calling functions
DROP POLICY IF EXISTS "Users can view case_users for their cases" ON case_users;
CREATE POLICY "Users can view case_users for their cases"
  ON case_users FOR SELECT
  USING (
    -- User can only see case_users rows where they are the user_id
    -- This is the simplest approach that avoids all recursion
    user_id = auth.uid()
  );

-- Note: This means users can only see their own case_users rows
-- They won't see other users on the same case via case_users table
-- But they can still see the case itself (via cases policy) and other users
-- can be shown via application logic if needed

