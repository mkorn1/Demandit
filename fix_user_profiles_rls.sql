-- ============================================
-- Fix Infinite Recursion in user_profiles
-- ============================================
-- The user_profiles SELECT policy queries user_profiles itself,
-- causing recursion when joined with other tables.

-- Option 1: Simplify the policy using a helper function
-- Create a function to get user's company_id (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_company_id(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- SECURITY DEFINER allows this to bypass RLS
  RETURN (
    SELECT company_id FROM user_profiles WHERE id = p_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_company_id(UUID) TO authenticated;

-- Update user_profiles SELECT policy to use the function
DROP POLICY IF EXISTS "Users can view profiles in their company" ON user_profiles;
CREATE POLICY "Users can view profiles in their company"
  ON user_profiles FOR SELECT
  USING (
    -- Use function to get company_id (bypasses RLS, no recursion)
    company_id = get_user_company_id(auth.uid())
  );

-- ============================================
-- Alternative: Disable RLS on user_profiles
-- ============================================
-- If the above doesn't work, you can disable RLS entirely:
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
-- 
-- This is safe if:
-- - Your application always filters user_profiles appropriately
-- - You trust your application layer to enforce access control
-- - Other tables (cases, templates) still have RLS enabled

