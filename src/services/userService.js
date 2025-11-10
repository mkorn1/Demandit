import { supabase } from './supabase'

/**
 * Get all users on a case
 */
export async function getCaseUsers(caseId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that user is part of the case
  const { data, error } = await supabase
    .from('case_users')
    .select(`
      user_id,
      added_at,
      added_by,
      user_profiles (
        id,
        company_id,
        companies (name)
      )
    `)
    .eq('case_id', caseId)

  if (error) throw error
  return data
}

/**
 * Add a user to a case
 * The user must be in the same company as the current user
 */
export async function addUserToCase(caseId, userId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that:
  // 1. Current user is part of the case
  // 2. Added user is in the same company
  const { data, error } = await supabase
    .from('case_users')
    .insert({
      case_id: caseId,
      user_id: userId,
      added_by: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove a user from a case
 * Current user must be part of the case
 */
export async function removeUserFromCase(caseId, userId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // RLS will enforce that current user is part of the case
  const { error } = await supabase
    .from('case_users')
    .delete()
    .eq('case_id', caseId)
    .eq('user_id', userId)

  if (error) throw error
}

/**
 * Get all users in the current user's company (for adding to cases)
 * Note: Email addresses are not included as Supabase doesn't allow direct joins with auth.users
 * You may want to store email in user_profiles or fetch separately if needed
 */
export async function getCompanyUsersForCase() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get user's company
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('User profile not found')

  // Get all users in the same company
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, company_id')
    .eq('company_id', profile.company_id)

  if (error) throw error
  return data
}

