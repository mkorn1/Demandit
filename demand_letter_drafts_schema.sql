-- ============================================
-- Demand Letter Drafts Table Schema
-- ============================================
-- This table stores generated demand letter drafts with version control
-- Supports shared drafts across all users on a case

-- Create the demand_letter_drafts table
CREATE TABLE IF NOT EXISTS demand_letter_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'saved')),
  rendered_content TEXT NOT NULL,
  template_id UUID REFERENCES case_templates(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  saved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique version numbers per case
  UNIQUE(case_id, version_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drafts_case ON demand_letter_drafts(case_id);
CREATE INDEX IF NOT EXISTS idx_drafts_case_version ON demand_letter_drafts(case_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON demand_letter_drafts(case_id, status);
CREATE INDEX IF NOT EXISTS idx_drafts_created_by ON demand_letter_drafts(created_by);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_demand_letter_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_update_demand_letter_drafts_updated_at
  BEFORE UPDATE ON demand_letter_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_demand_letter_drafts_updated_at();

-- Create function to get next version number for a case
CREATE OR REPLACE FUNCTION get_next_draft_version(p_case_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM demand_letter_drafts
  WHERE case_id = p_case_id;
  
  RETURN next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE demand_letter_drafts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for demand_letter_drafts
-- ============================================

-- Policy: Users can view drafts for cases they're part of
CREATE POLICY "Users can view drafts for their cases"
  ON demand_letter_drafts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM case_users
      WHERE case_users.case_id = demand_letter_drafts.case_id
      AND case_users.user_id = auth.uid()
    )
  );

-- Policy: Users can create drafts for cases they're part of
CREATE POLICY "Users can create drafts for their cases"
  ON demand_letter_drafts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM case_users
      WHERE case_users.case_id = demand_letter_drafts.case_id
      AND case_users.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Policy: Users can update drafts for cases they're part of
-- (Allows any case user to update, since drafts are shared)
CREATE POLICY "Users can update drafts for their cases"
  ON demand_letter_drafts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM case_users
      WHERE case_users.case_id = demand_letter_drafts.case_id
      AND case_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM case_users
      WHERE case_users.case_id = demand_letter_drafts.case_id
      AND case_users.user_id = auth.uid()
    )
  );

-- Policy: Users can delete drafts for cases they're part of
-- (Allows any case user to delete, since drafts are shared)
CREATE POLICY "Users can delete drafts for their cases"
  ON demand_letter_drafts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM case_users
      WHERE case_users.case_id = demand_letter_drafts.case_id
      AND case_users.user_id = auth.uid()
    )
  );

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE demand_letter_drafts IS 'Stores generated demand letter drafts with version control. Drafts are shared across all users on a case.';
COMMENT ON COLUMN demand_letter_drafts.version_number IS 'Auto-incremented version number per case, starting at 1';
COMMENT ON COLUMN demand_letter_drafts.status IS 'draft = unsaved, saved = explicitly saved by user';
COMMENT ON COLUMN demand_letter_drafts.rendered_content IS 'The full generated letter text';
COMMENT ON COLUMN demand_letter_drafts.template_id IS 'Reference to the case_template used for generation (nullable)';
COMMENT ON COLUMN demand_letter_drafts.saved_by IS 'User who explicitly saved this draft (nullable, only set when status = saved)';
COMMENT ON COLUMN demand_letter_drafts.saved_at IS 'Timestamp when draft was explicitly saved (nullable)';

