import { supabase } from './supabase'

/**
 * Get all cases for the current user
 */
export async function getCases() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single case by ID
 */
export async function getCase(caseId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .eq('user_id', user.id)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a new case
 */
export async function createCase(caseData) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('cases')
    .insert({
      ...caseData,
      user_id: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a case
 */
export async function updateCase(caseId, updates) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('cases')
    .update(updates)
    .eq('id', caseId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a case
 */
export async function deleteCase(caseId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('cases')
    .delete()
    .eq('id', caseId)
    .eq('user_id', user.id)

  if (error) throw error
}

/**
 * Get all messages for a case
 */
export async function getCaseMessages(caseId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Verify case belongs to user
  const { data: caseData } = await supabase
    .from('cases')
    .select('id')
    .eq('id', caseId)
    .eq('user_id', user.id)
    .single()

  if (!caseData) throw new Error('Case not found or access denied')

  const { data, error } = await supabase
    .from('case_messages')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Add a message to a case
 */
export async function addCaseMessage(caseId, message) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Verify case belongs to user
  const { data: caseData } = await supabase
    .from('cases')
    .select('id')
    .eq('id', caseId)
    .eq('user_id', user.id)
    .single()

  if (!caseData) throw new Error('Case not found or access denied')

  const { data, error } = await supabase
    .from('case_messages')
    .insert({
      case_id: caseId,
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
 */
export async function updateCaseMetadata(caseId, metadata) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('cases')
    .update({ metadata })
    .eq('id', caseId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

