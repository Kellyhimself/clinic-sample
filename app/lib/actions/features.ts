'use server'

import { createClient } from '@/app/lib/supabase/server'

type PlanType = 'free' | 'pro' | 'enterprise'

// Define plan type hierarchy
const PLAN_HIERARCHY = {
  'free': 0,
  'pro': 1,
  'enterprise': 2
} as const

export async function checkFeatureAccess(requiredPlan: PlanType): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return false
    }

    // Set tenant context
    const { error: setContextError } = await supabase
      .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id })

    if (setContextError) {
      console.error('Error setting tenant context:', setContextError)
      return false
    }

    // Get tenant ID from context
    const { data: tenantId, error: getTenantError } = await supabase
      .rpc('get_tenant_id')

    if (getTenantError || !tenantId) {
      console.error('Failed to get tenant ID:', getTenantError)
      return false
    }
    
    // Get tenant's plan type
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('plan_type')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      console.error('Error fetching tenant plan:', tenantError)
      return false
    }

    // Check if tenant's plan meets or exceeds the required plan
    const tenantPlan = tenant.plan_type as PlanType
    return PLAN_HIERARCHY[tenantPlan] >= PLAN_HIERARCHY[requiredPlan]
  } catch (error) {
    console.error('Error in checkFeatureAccess:', error)
    return false
  }
}

export async function getTenantFeatures(): Promise<string[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return []
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return []
    }

    // Set tenant context
    const { error: setContextError } = await supabase
      .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id })

    if (setContextError) {
      console.error('Error setting tenant context:', setContextError)
      return []
    }

    // Get tenant ID from context
    const { data: tenantId, error: getTenantError } = await supabase
      .rpc('get_tenant_id')

    if (getTenantError || !tenantId) {
      console.error('Failed to get tenant ID:', getTenantError)
      return []
    }
    
    // Get tenant's plan type
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('plan_type')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      console.error('Error fetching tenant plan:', tenantError)
      return []
    }

    // Return features based on plan type as defined in SAAS.md
    const plan = tenant.plan_type as PlanType
    switch (plan) {
      case 'enterprise':
        return [
          'appointments', // Unlimited
          'inventory', // Full inventory management
          'billing', // M-Pesa integration
          'pharmacy', // Full pharmacy management
          'services', // All services
          'analytics', // Advanced analytics
          'reports', // Comprehensive reporting
          'user_management', // Unlimited users
          'integrations', // Custom integrations
          'multi_location', // Multi-location support
          'api_access', // API access
          'data_export' // Data export capabilities
        ]
      case 'pro':
        return [
          'appointments', // Unlimited
          'inventory', // Full inventory management
          'billing', // M-Pesa integration
          'pharmacy', // Full pharmacy management
          'services', // All services
          'analytics', // Basic analytics
          'reports', // Comprehensive reporting
          'user_management' // Up to 5 users
        ]
      case 'free':
      default:
        return [
          'appointments', // Limited to 100/month
          'inventory', // Limited to 50 items
          'billing', // Basic billing
          'pharmacy', // Basic pharmacy features
          'services' // Basic services
        ]
    }
  } catch (error) {
    console.error('Error in getTenantFeatures:', error)
    return []
  }
} 