import { supabase } from './supabase'

// ============================================
// Company Templates (shared across company)
// ============================================

/**
 * Get all templates for the current user's company
 */
export async function getCompanyTemplates() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user can only see templates in their company
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single company template by ID
 */
export async function getCompanyTemplate(templateId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a new company template
 */
export async function createCompanyTemplate(template) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get user's company_id
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('User profile not found')

  const { data, error } = await supabase
    .from('templates')
    .insert({
      company_id: profile.company_id,
      name: template.name,
      type: template.type || 'demand-letter',
      content: template.content,
      created_by: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a company template
 */
export async function updateCompanyTemplate(templateId, updates) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user can only update templates in their company
  const { data, error } = await supabase
    .from('templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a company template
 */
export async function deleteCompanyTemplate(templateId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user can only delete templates in their company
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', templateId)

  if (error) throw error
}

// ============================================
// Case Templates (template instances/snapshots)
// ============================================

/**
 * Get all template instances for a case
 */
export async function getCaseTemplates(caseId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user is part of the case
  const { data, error } = await supabase
    .from('case_templates')
    .select('*')
    .eq('case_id', caseId)
    .order('added_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single case template instance by ID
 */
export async function getCaseTemplate(caseTemplateId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('case_templates')
    .select('*')
    .eq('id', caseTemplateId)
    .single()

  if (error) throw error
  return data
}

/**
 * Add a company template to a case (creates a snapshot)
 */
export async function addTemplateToCase(caseId, templateId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get the template to create a snapshot
  const template = await getCompanyTemplate(templateId)

  // RLS will enforce that user is part of the case
  const { data, error } = await supabase
    .from('case_templates')
    .insert({
      case_id: caseId,
      template_id: templateId, // Reference to original template
      name: template.name,
      type: template.type,
      content: template.content, // Snapshot of content
      added_by: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a case template instance
 */
export async function updateCaseTemplate(caseTemplateId, updates) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user is part of the case
  const { data, error } = await supabase
    .from('case_templates')
    .update(updates)
    .eq('id', caseTemplateId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a case template instance
 */
export async function deleteCaseTemplate(caseTemplateId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user is part of the case
  const { error } = await supabase
    .from('case_templates')
    .delete()
    .eq('id', caseTemplateId)

  if (error) throw error
}

/**
 * Get or create a case template from a company template ID
 * This ensures we have a case_template ID to use in drafts
 * @param {string} caseId - The case ID
 * @param {string|null} companyTemplateId - The company template ID (from templates table)
 * @returns {Promise<string|null>} The case template ID, or null if companyTemplateId is null
 */
export async function getOrCreateCaseTemplate(caseId, companyTemplateId) {
  if (!companyTemplateId) {
    return null
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Check if a case_template already exists for this case and company template
  const { data: existing, error: queryError } = await supabase
    .from('case_templates')
    .select('id')
    .eq('case_id', caseId)
    .eq('template_id', companyTemplateId)
    .maybeSingle()

  if (queryError) throw queryError

  // If it exists, return its ID
  if (existing) {
    return existing.id
  }

  // Otherwise, create a new case_template snapshot
  const caseTemplate = await addTemplateToCase(caseId, companyTemplateId)
  return caseTemplate.id
}

