import { supabase } from './supabase'

/**
 * Get the next version number for a case
 * Uses the database function to ensure atomic increment
 */
async function getNextVersionNumber(caseId) {
  const { data, error } = await supabase.rpc('get_next_draft_version', {
    p_case_id: caseId
  })

  if (error) throw error
  return data
}

/**
 * Generate a new draft (creates new version)
 * @param {string} caseId - The case ID
 * @param {string} renderedContent - The generated letter content
 * @param {string|null} templateId - The case template ID used (nullable)
 * @returns {Promise<Object>} The created draft
 */
export async function generateDraft(caseId, renderedContent, templateId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get next version number
  const versionNumber = await getNextVersionNumber(caseId)

  // RLS will enforce that user is part of the case
  const { data, error } = await supabase
    .from('demand_letter_drafts')
    .insert({
      case_id: caseId,
      version_number: versionNumber,
      status: 'draft',
      rendered_content: renderedContent,
      template_id: templateId,
      created_by: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get the current (latest) draft for a case
 * @param {string} caseId - The case ID
 * @returns {Promise<Object|null>} The latest draft or null if none exists
 */
export async function getCurrentDraft(caseId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user is part of the case
  const { data, error } = await supabase
    .from('demand_letter_drafts')
    .select('*')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Get all draft versions for a case, ordered by version number (newest first)
 * @param {string} caseId - The case ID
 * @returns {Promise<Array>} Array of all draft versions
 */
export async function getDraftVersions(caseId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user is part of the case
  const { data, error } = await supabase
    .from('demand_letter_drafts')
    .select(`
      *,
      created_by_user:user_profiles!demand_letter_drafts_created_by_fkey(
        id,
        id
      )
    `)
    .eq('case_id', caseId)
    .order('version_number', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get a specific draft by ID
 * @param {string} draftId - The draft ID
 * @returns {Promise<Object>} The draft
 */
export async function getDraft(draftId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user is part of the case
  const { data, error } = await supabase
    .from('demand_letter_drafts')
    .select('*')
    .eq('id', draftId)
    .single()

  if (error) throw error
  return data
}

/**
 * Save a draft (marks it as saved)
 * @param {string} draftId - The draft ID
 * @returns {Promise<Object>} The updated draft
 */
export async function saveDraft(draftId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user is part of the case
  const { data, error } = await supabase
    .from('demand_letter_drafts')
    .update({
      status: 'saved',
      saved_by: user.id,
      saved_at: new Date().toISOString()
    })
    .eq('id', draftId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Regenerate a draft (creates a new version)
 * This is essentially the same as generateDraft, but provided for clarity
 * @param {string} caseId - The case ID
 * @param {string} renderedContent - The newly generated letter content
 * @param {string|null} templateId - The case template ID used (nullable)
 * @returns {Promise<Object>} The new draft version
 */
export async function regenerateDraft(caseId, renderedContent, templateId = null) {
  // Regeneration is the same as generating a new draft
  return generateDraft(caseId, renderedContent, templateId)
}

/**
 * Delete a draft version
 * @param {string} draftId - The draft ID to delete
 * @returns {Promise<void>}
 */
export async function deleteDraftVersion(draftId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user is part of the case
  const { error } = await supabase
    .from('demand_letter_drafts')
    .delete()
    .eq('id', draftId)

  if (error) throw error
}

