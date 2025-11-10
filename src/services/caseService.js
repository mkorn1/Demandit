import { supabase } from './supabase'

/**
 * Get all cases for the current user (cases they're part of via case_users)
 */
export async function getCases() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('case_users')
    .select(`
      cases (
        id,
        user_id,
        company_id,
        title,
        contact_info,
        metadata,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)

  if (error) throw error
  
  // Extract cases from the joined data and sort
  const cases = data.map(item => item.cases).filter(Boolean)
  return cases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

/**
 * Get a single case by ID (user must be part of the case via case_users)
 */
export async function getCase(caseId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Verify user has access via case_users (RLS will enforce this)
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a new case
 * Automatically sets company_id from user's profile and adds creator to case_users (via trigger)
 */
export async function createCase(caseData) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get user's company_id from profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('User profile not found. Please contact support.')
  }

  const { data, error } = await supabase
    .from('cases')
    .insert({
      ...caseData,
      user_id: user.id,
      company_id: profile.company_id
    })
    .select()
    .single()

  if (error) throw error
  // Note: case_users entry is automatically created by database trigger
  return data
}

/**
 * Update a case (user must be part of the case via case_users)
 */
export async function updateCase(caseId, updates) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user is part of the case
  const { data, error } = await supabase
    .from('cases')
    .update(updates)
    .eq('id', caseId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a case (user must be part of the case via case_users)
 */
export async function deleteCase(caseId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user is part of the case
  const { error } = await supabase
    .from('cases')
    .delete()
    .eq('id', caseId)

  if (error) throw error
}

/**
 * Get all messages for a case (only the current user's messages)
 */
export async function getCaseMessages(caseId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user is part of the case and only show their messages
  const { data, error } = await supabase
    .from('case_messages')
    .select('*')
    .eq('case_id', caseId)
    .eq('user_id', user.id) // Only get current user's messages
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Add a message to a case (user must be part of the case via case_users)
 */
export async function addCaseMessage(caseId, message) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user is part of the case
  const { data, error } = await supabase
    .from('case_messages')
    .insert({
      case_id: caseId,
      user_id: user.id, // Associate message with current user
      text: message.text,
      sender: message.sender,
      metadata: message.metadata || {}
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update case metadata (selected chat type, etc.)
 * User must be part of the case via case_users
 */
export async function updateCaseMetadata(caseId, metadata) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user is part of the case
  const { data, error } = await supabase
    .from('cases')
    .update({ metadata })
    .eq('id', caseId)
    .select()
    .single()

  if (error) throw error
  return data
}

