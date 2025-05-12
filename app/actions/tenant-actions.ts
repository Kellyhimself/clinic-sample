'use server'

import { getServerActionContext, getServerActionContextWithSubscription, validateSubscriptionRequirements, checkUsage } from '@/lib/server-utils'

export async function createNewUser(email: string, password: string, fullName: string) {
  const context = await getServerActionContextWithSubscription()
  const { supabase, tenantId, subscription } = context

  // Check if we have access to user management
  const { hasAccess, message } = await validateSubscriptionRequirements('basic', 'user_management')
  if (!hasAccess) {
    throw new Error(message)
  }

  // Check if we're within user limits
  const usage = await checkUsage('users')
  if (!usage.isWithinLimit) {
    throw new Error(`Cannot create new user: ${usage.message}`)
  }

  // Create the user
  const { data: user, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      tenant_id: tenantId
    }
  })

  if (error) throw error

  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      full_name: fullName,
      tenant_id: tenantId,
      role: 'user'
    })

  if (profileError) throw profileError

  return user
}

export async function createAppointment(patientId: string, date: string, type: string) {
  const context = await getServerActionContextWithSubscription()
  const { supabase, tenantId, subscription } = context

  // Check if we have access to appointments
  const { hasAccess, message } = await validateSubscriptionRequirements('free', 'appointments')
  if (!hasAccess) {
    throw new Error(message)
  }

  // Check if we're within appointment limits
  const usage = await checkUsage('appointments')
  if (!usage.isWithinLimit) {
    throw new Error(`Cannot create appointment: ${usage.message}`)
  }

  // Create the appointment
  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: patientId,
      tenant_id: tenantId,
      date,
      type
    })
    .select()
    .single()

  if (error) throw error

  return appointment
}

export async function addInventoryItem(name: string, quantity: number) {
  const context = await getServerActionContextWithSubscription()
  const { supabase, tenantId, subscription } = context

  // Check if we have access to inventory management
  const { hasAccess, message } = await validateSubscriptionRequirements('basic', 'inventory')
  if (!hasAccess) {
    throw new Error(message)
  }

  // Check if we're within inventory limits
  const usage = await checkUsage('inventory')
  if (!usage.isWithinLimit) {
    throw new Error(`Cannot add inventory item: ${usage.message}`)
  }

  // Add the inventory item
  const { data: item, error } = await supabase
    .from('inventory')
    .insert({
      name,
      quantity,
      tenant_id: tenantId
    })
    .select()
    .single()

  if (error) throw error

  return item
} 