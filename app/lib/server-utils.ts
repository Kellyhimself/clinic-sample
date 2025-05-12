import { createClient } from '@/app/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { hasFeature, type PlanType, type Feature, SUBSCRIPTION_LIMITS } from '@/app/lib/config/features/subscriptionFeatures'

export type ServerActionContext = {
  supabase: ReturnType<typeof createClient>
  tenantId: string
  userId: string
  role: string
}

export type ServerActionContextWithSubscription = ServerActionContext & {
  subscription: {
    plan: PlanType
    features: string[]
    limits: {
      max_patients: number
      max_appointments: number
      max_inventory: number
      max_users: number
      max_transactions_per_month: number
    }
  }
}

// Helper function to check usage limits
export async function checkUsageLimit(tenantId: string, limitType: keyof typeof SUBSCRIPTION_LIMITS.free): Promise<{ allowed: boolean; current: number; limit: number }> {
  const supabase = await createClient()

  // Set tenant context in database session
  console.log('Setting tenant context in checkUsageLimit...');
  const { error: contextError } = await (supabase.rpc as any)('set_tenant_context', {
    p_tenant_id: tenantId
  });

  if (contextError) {
    console.error('Error setting tenant context:', contextError);
    throw new Error('Failed to set tenant context');
  }

  // Get tenant's subscription plan
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('plan_type')
    .eq('id', tenantId)
    .single()

  if (tenantError) {
    console.error('Error fetching tenant:', tenantError)
    throw new Error(`Failed to fetch tenant: ${tenantError.message}`)
  }

  if (!tenant) {
    console.error('Tenant not found:', tenantId)
    throw new Error('Tenant not found')
  }

  const plan = tenant.plan_type as PlanType
  if (!plan) {
    console.error('No subscription plan found for tenant:', tenantId)
    throw new Error('No subscription plan found')
  }

  const limit = SUBSCRIPTION_LIMITS[plan][limitType]
  if (limit === undefined) {
    console.error('Invalid limit type:', limitType, 'for plan:', plan)
    throw new Error(`Invalid limit type: ${limitType}`)
  }

  // If limit is -1, it means unlimited
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1 }
  }

  // Get current usage based on limit type
  let current = 0
  switch (limitType) {
    case 'max_patients':
      const { count: patientCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      current = patientCount || 0
      break
    case 'max_appointments_per_month':
      const { count: appointmentCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      current = appointmentCount || 0
      break
    case 'max_inventory_items':
      const { count: inventoryCount } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      current = inventoryCount || 0
      break
    case 'max_users':
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      current = userCount || 0
      break
    case 'max_transactions_per_month':
      const { count: salesCount, error: salesError } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('payment_status', 'paid')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .lte('created_at', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString())

      if (salesError) {
        console.error('Error checking sales limit:', salesError)
        throw new Error(`Failed to check sales limit: ${salesError.message}`)
      }

      current = salesCount || 0
      break
    default:
      throw new Error(`Unknown limit type: ${limitType}`)
  }

  return {
    allowed: current < limit,
    current,
    limit
  }
}

// Helper function to check if usage is within limits
async function isWithinLimit(tenantId: string, type: 'patients' | 'appointments' | 'inventory' | 'users'): Promise<boolean> {
  const { current, limit } = await checkUsageLimit(tenantId, type as keyof typeof SUBSCRIPTION_LIMITS.free)
  return limit === -1 || current < limit // -1 means unlimited
}

export async function getServerActionContext(): Promise<ServerActionContext> {
  console.log('Getting server action context...');
  const supabase = await createClient()
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const userId = headersList.get('x-user-id')
  const role = headersList.get('x-tenant-role') || 'user'

  console.log('Headers received:', {
    tenantId: tenantId || 'missing',
    userId: userId || 'missing',
    role: role || 'missing'
  });

  if (!tenantId) {
    console.log('No tenant ID found in headers, redirecting to login');
    redirect('/login')
  }

  if (!userId) {
    console.log('No user ID found in headers, redirecting to login');
    redirect('/login')
  }

  console.log('Successfully got server action context');
  return {
    supabase,
    tenantId,
    userId,
    role
  }
}

export async function getServerActionContextWithSubscription(): Promise<ServerActionContextWithSubscription> {
  const context = await getServerActionContext()
  const { supabase, tenantId } = context

  // Get subscription details
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, features')
    .eq('tenant_id', tenantId)
    .single()

  if (!subscription) {
    throw new Error('No subscription found for tenant')
  }

  const plan = subscription.plan as PlanType
  const planLimits = SUBSCRIPTION_LIMITS[plan]

  return {
    ...context,
    subscription: {
      plan,
      features: [...planLimits.features],
      limits: {
        max_patients: planLimits.max_patients,
        max_appointments: planLimits.max_appointments_per_month,
        max_inventory: planLimits.max_inventory_items,
        max_users: planLimits.max_users,
        max_transactions_per_month: planLimits.max_transactions_per_month
      }
    }
  }
}

// Helper function to check feature access
export async function checkFeatureAccess(featureId: string): Promise<boolean> {
  const { tenantId } = await getServerActionContext()
  return hasFeature(tenantId, featureId)
}

// Helper function to check usage limits
export async function checkUsage(type: 'patients' | 'appointments' | 'inventory' | 'users'): Promise<{
  isWithinLimit: boolean
  current: number
  limit: number
  message: string
}> {
  const { tenantId } = await getServerActionContext()
  const usage = await checkUsageLimit(tenantId, type as keyof typeof SUBSCRIPTION_LIMITS.free)
  const withinLimit = await isWithinLimit(tenantId, type)
  
  return {
    isWithinLimit: withinLimit,
    current: usage.current,
    limit: usage.limit,
    message: `Current usage: ${usage.current}/${usage.limit} ${type}`
  }
}

// Helper function to validate subscription requirements
export async function validateSubscriptionRequirements(
  requiredPlan: PlanType,
  requiredFeature?: string
): Promise<{ hasAccess: boolean; message?: string }> {
  const context = await getServerActionContextWithSubscription()
  const { subscription } = context

  const planOrder = { free: 0, pro: 1, enterprise: 2 } as const
  const hasPlanAccess = planOrder[subscription.plan] >= planOrder[requiredPlan]

  if (!hasPlanAccess) {
    return {
      hasAccess: false,
      message: `This action requires a ${requiredPlan} plan or higher`
    }
  }

  if (requiredFeature && !subscription.features.includes(requiredFeature)) {
    return {
      hasAccess: false,
      message: `This action requires the ${requiredFeature} feature`
    }
  }

  return { hasAccess: true }
}

// Helper function to get features by category
export async function getFeaturesByCategory(category: Feature['category']): Promise<Feature[]> {
  const { getFeaturesByCategory } = await import('@/app/lib/config/features/subscriptionFeatures')
  return getFeaturesByCategory(category)
}

// Helper function to check if a feature is enabled
export async function isFeatureEnabled(featureId: string): Promise<boolean> {
  const { FEATURES } = await import('@/app/lib/config/features/subscriptionFeatures')
  const feature = FEATURES.find(f => f.id === featureId)
  return !!feature
} 