-- ============================================
-- Database Migration: Multi-User Cases & Company Templates
-- ============================================
-- This migration adds support for:
-- 1. Companies (users belong to one company)
-- 2. Company-wide templates
-- 3. Case template instances (snapshots when added to cases)
-- 4. Multiple users per case with individual chat history
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Create companies table
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. Create user_profiles table
-- Extends auth.users with company_id
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(id)
);

-- ============================================
-- 3. Create templates table (company-wide)
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'demand-letter',
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. Modify cases table
-- Add company_id, keep user_id as creator
-- ============================================
-- First, add company_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE cases ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ============================================
-- 5. Create case_templates table
-- Stores template instances (snapshots) for each case
-- ============================================
CREATE TABLE IF NOT EXISTS case_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL, -- Snapshot of template content when added
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 6. Create case_users table
-- Many-to-many relationship: users can be on multiple cases
-- ============================================
CREATE TABLE IF NOT EXISTS case_users (
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (case_id, user_id)
);

-- ============================================
-- 7. Modify case_messages table
-- Add user_id to track which user sent each message
-- ============================================
-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'case_messages' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE case_messages ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Migrate existing messages: assign to case creator
    UPDATE case_messages cm
    SET user_id = c.user_id
    FROM cases c
    WHERE cm.case_id = c.id AND cm.user_id IS NULL;
    
    -- Make user_id NOT NULL after migration
    ALTER TABLE case_messages ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- ============================================
-- 8. Create indexes for better query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_company_id ON templates(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_company_id ON cases(company_id);
CREATE INDEX IF NOT EXISTS idx_case_templates_case_id ON case_templates(case_id);
CREATE INDEX IF NOT EXISTS idx_case_templates_template_id ON case_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_case_users_case_id ON case_users(case_id);
CREATE INDEX IF NOT EXISTS idx_case_users_user_id ON case_users(user_id);
CREATE INDEX IF NOT EXISTS idx_case_messages_user_id ON case_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_case_messages_case_user ON case_messages(case_id, user_id);

-- ============================================
-- 9. Create triggers for updated_at timestamps
-- ============================================
-- Function to update updated_at (reuse existing if present)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Keep existing cases trigger
DROP TRIGGER IF EXISTS update_cases_updated_at ON cases;
CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. RLS Policies for companies
-- ============================================
-- Users can view their own company
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.company_id = companies.id
    )
  );

-- ============================================
-- 12. RLS Policies for user_profiles
-- ============================================
-- Users can view profiles in their company
DROP POLICY IF EXISTS "Users can view profiles in their company" ON user_profiles;
CREATE POLICY "Users can view profiles in their company"
  ON user_profiles FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- ============================================
-- 13. RLS Policies for templates
-- ============================================
-- Users can view templates in their company
DROP POLICY IF EXISTS "Users can view company templates" ON templates;
CREATE POLICY "Users can view company templates"
  ON templates FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can create templates in their company
DROP POLICY IF EXISTS "Users can create company templates" ON templates;
CREATE POLICY "Users can create company templates"
  ON templates FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can update templates in their company
DROP POLICY IF EXISTS "Users can update company templates" ON templates;
CREATE POLICY "Users can update company templates"
  ON templates FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can delete templates in their company
DROP POLICY IF EXISTS "Users can delete company templates" ON templates;
CREATE POLICY "Users can delete company templates"
  ON templates FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- 14. Helper function: Check if user is on case (bypasses RLS)
-- ============================================
-- This function can check case_users without triggering RLS recursion
-- Must be created BEFORE policies that use it
CREATE OR REPLACE FUNCTION is_user_on_case(p_case_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM case_users
    WHERE case_id = p_case_id
    AND user_id = p_user_id
  );
END;
$$;

-- ============================================
-- 14.5. RLS Policies for cases (updated)
-- ============================================
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own cases" ON cases;
DROP POLICY IF EXISTS "Users can insert their own cases" ON cases;
DROP POLICY IF EXISTS "Users can update their own cases" ON cases;
DROP POLICY IF EXISTS "Users can delete their own cases" ON cases;

-- Users can view cases they're part of
-- Fix: Use security definer function to avoid recursion with case_users policies
CREATE POLICY "Users can view cases they're part of"
  ON cases FOR SELECT
  USING (
    -- User is the creator
    user_id = auth.uid()
    -- OR user is on the case (checked via function that bypasses RLS)
    OR is_user_on_case(cases.id, auth.uid())
  );

-- Users can create cases in their company
CREATE POLICY "Users can create cases in their company"
  ON cases FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
    AND user_id = auth.uid() -- Creator
  );

-- Users can update cases they're part of
-- Fix: Use security definer function to avoid recursion with case_users policies
CREATE POLICY "Users can update cases they're part of"
  ON cases FOR UPDATE
  USING (
    -- User is the creator
    user_id = auth.uid()
    -- OR user is on the case (checked via function that bypasses RLS)
    OR is_user_on_case(cases.id, auth.uid())
  );

-- Users can delete cases they're part of
-- Fix: Use security definer function to avoid recursion with case_users policies
CREATE POLICY "Users can delete cases they're part of"
  ON cases FOR DELETE
  USING (
    -- User is the creator
    user_id = auth.uid()
    -- OR user is on the case (checked via function that bypasses RLS)
    OR is_user_on_case(cases.id, auth.uid())
  );

-- ============================================
-- 15. RLS Policies for case_users
-- ============================================
-- Users can view case_users for cases in their company
-- Fix: Check cases table instead of case_users to avoid recursion
DROP POLICY IF EXISTS "Users can view case_users for their cases" ON case_users;
CREATE POLICY "Users can view case_users for their cases"
  ON case_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE c.id = case_users.case_id
      AND c.company_id = up.company_id
    )
  );

-- Users can add users to cases in their company
-- Fix: Use security definer function to check if user is on case (avoids recursion)
DROP POLICY IF EXISTS "Users can add users to their cases" ON case_users;
CREATE POLICY "Users can add users to their cases"
  ON case_users FOR INSERT
  WITH CHECK (
    -- Check that the case is in the user's company
    EXISTS (
      SELECT 1 FROM cases c
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE c.id = case_users.case_id
      AND c.company_id = up.company_id
    )
    -- Ensure added user is in the same company
    AND user_id IN (
      SELECT up2.id FROM user_profiles up2
      WHERE up2.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
    -- Verify current user is on the case (using security definer function to avoid recursion)
    AND (
      -- User is the case creator
      EXISTS (
        SELECT 1 FROM cases c2
        WHERE c2.id = case_users.case_id
        AND c2.user_id = auth.uid()
      )
      -- OR user is already on the case (checked via function that bypasses RLS)
      OR is_user_on_case(case_users.case_id, auth.uid())
    )
  );

-- Users can remove users from cases in their company
-- Fix: Use security definer function to check if user is on case (avoids recursion)
DROP POLICY IF EXISTS "Users can remove users from their cases" ON case_users;
CREATE POLICY "Users can remove users from their cases"
  ON case_users FOR DELETE
  USING (
    -- Check that the case is in the user's company
    EXISTS (
      SELECT 1 FROM cases c
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE c.id = case_users.case_id
      AND c.company_id = up.company_id
    )
    -- Verify current user is on the case (using security definer function to avoid recursion)
    AND (
      -- User is the case creator
      EXISTS (
        SELECT 1 FROM cases c2
        WHERE c2.id = case_users.case_id
        AND c2.user_id = auth.uid()
      )
      -- OR user is already on the case (checked via function that bypasses RLS)
      OR is_user_on_case(case_users.case_id, auth.uid())
    )
  );

-- ============================================
-- 16. RLS Policies for case_templates
-- ============================================
-- Users can view case_templates for cases in their company
-- Fix: Check cases table instead of case_users to avoid recursion
DROP POLICY IF EXISTS "Users can view case_templates for their cases" ON case_templates;
CREATE POLICY "Users can view case_templates for their cases"
  ON case_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE c.id = case_templates.case_id
      AND c.company_id = up.company_id
    )
    -- Verify user is on the case (using security definer function)
    AND (
      EXISTS (
        SELECT 1 FROM cases c2
        WHERE c2.id = case_templates.case_id
        AND c2.user_id = auth.uid()
      )
      OR is_user_on_case(case_templates.case_id, auth.uid())
    )
  );

-- Users can add templates to cases they're part of
DROP POLICY IF EXISTS "Users can add templates to their cases" ON case_templates;
CREATE POLICY "Users can add templates to their cases"
  ON case_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE c.id = case_templates.case_id
      AND c.company_id = up.company_id
    )
    -- Verify user is on the case (using security definer function)
    AND (
      EXISTS (
        SELECT 1 FROM cases c2
        WHERE c2.id = case_templates.case_id
        AND c2.user_id = auth.uid()
      )
      OR is_user_on_case(case_templates.case_id, auth.uid())
    )
  );

-- Users can update case_templates for cases they're part of
DROP POLICY IF EXISTS "Users can update case_templates for their cases" ON case_templates;
CREATE POLICY "Users can update case_templates for their cases"
  ON case_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE c.id = case_templates.case_id
      AND c.company_id = up.company_id
    )
    -- Verify user is on the case (using security definer function)
    AND (
      EXISTS (
        SELECT 1 FROM cases c2
        WHERE c2.id = case_templates.case_id
        AND c2.user_id = auth.uid()
      )
      OR is_user_on_case(case_templates.case_id, auth.uid())
    )
  );

-- Users can delete case_templates for cases they're part of
DROP POLICY IF EXISTS "Users can delete case_templates for their cases" ON case_templates;
CREATE POLICY "Users can delete case_templates for their cases"
  ON case_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE c.id = case_templates.case_id
      AND c.company_id = up.company_id
    )
    -- Verify user is on the case (using security definer function)
    AND (
      EXISTS (
        SELECT 1 FROM cases c2
        WHERE c2.id = case_templates.case_id
        AND c2.user_id = auth.uid()
      )
      OR is_user_on_case(case_templates.case_id, auth.uid())
    )
  );

-- ============================================
-- 17. RLS Policies for case_messages (updated)
-- ============================================
-- Drop old policies
DROP POLICY IF EXISTS "Users can view messages for their own cases" ON case_messages;
DROP POLICY IF EXISTS "Users can insert messages for their own cases" ON case_messages;
DROP POLICY IF EXISTS "Users can update messages for their own cases" ON case_messages;
DROP POLICY IF EXISTS "Users can delete messages for their own cases" ON case_messages;

-- Users can view only their own messages for cases they're part of
CREATE POLICY "Users can view their own messages"
  ON case_messages FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM case_users
      WHERE case_users.case_id = case_messages.case_id
      AND case_users.user_id = auth.uid()
    )
  );

-- Users can insert their own messages for cases they're part of
CREATE POLICY "Users can insert their own messages"
  ON case_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM case_users
      WHERE case_users.case_id = case_messages.case_id
      AND case_users.user_id = auth.uid()
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
  ON case_messages FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM case_users
      WHERE case_users.case_id = case_messages.case_id
      AND case_users.user_id = auth.uid()
    )
  );

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON case_messages FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM case_users
      WHERE case_users.case_id = case_messages.case_id
      AND case_users.user_id = auth.uid()
    )
  );

-- ============================================
-- 18. Helper function: Auto-add creator to case_users
-- ============================================
-- Function to automatically add case creator to case_users
CREATE OR REPLACE FUNCTION auto_add_case_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO case_users (case_id, user_id, added_by)
  VALUES (NEW.id, NEW.user_id, NEW.user_id)
  ON CONFLICT (case_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-add creator when case is created
DROP TRIGGER IF EXISTS trigger_auto_add_case_creator ON cases;
CREATE TRIGGER trigger_auto_add_case_creator
  AFTER INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_case_creator();

-- ============================================
-- Migration Complete!
-- ============================================
-- Next steps:
-- 1. Create companies manually in Supabase or via your app
-- 2. Update user signup flow to require company_id
-- 3. Create user_profiles entry when user signs up
-- 4. Update application code to use new schema
-- ============================================

