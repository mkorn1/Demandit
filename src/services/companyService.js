import { supabase } from './supabase'

/**
 * Get all companies (for admin/signup purposes)
 * Note: In production, you might want to restrict this or use a different approach
 */
export async function getCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Get company by ID
 */
export async function getCompany(companyId) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (error) throw error
  return data
}

/**
 * Get current user's company
 */
export async function getUserCompany() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      company_id,
      companies (
        id,
        name,
        created_at,
        updated_at
      )
    `)
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data.companies
}

/**
 * Get current user's profile
 */
export async function getUserProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      id,
      company_id,
      created_at,
      updated_at,
      companies (
        id,
        name,
        created_at,
        updated_at
      )
    `)
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a new company
 */
export async function createCompany(name) {
  const { data, error } = await supabase
    .from('companies')
    .insert({ name })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get all users in the current user's company
 * Note: Email addresses are not included as Supabase doesn't allow direct joins with auth.users
 * You may want to store email in user_profiles or fetch separately if needed
 */
export async function getCompanyUsers() {
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
    .select('id, company_id, companies(*)')
    .eq('company_id', profile.company_id)

  if (error) throw error
  return data
}

