export type PlanType = 'free' | 'pro' | 'enterprise'

export type Feature = {
  id: string
  name: string
  description: string
  requiredPlan: PlanType
  category: 'analytics' | 'management' | 'reporting' | 'integration' | 'billing'
  isEnabled: boolean
}

export const FEATURES: Feature[] = [
  // Analytics Features
  {
    id: 'pharmacy_analytics',
    name: 'Pharmacy Analytics',
    description: 'Advanced pharmacy analytics and reporting',
    requiredPlan: 'pro',
    category: 'analytics',
    isEnabled: true
  },
  {
    id: 'pharmacy_reports',
    name: 'Pharmacy Reports',
    description: 'Detailed pharmacy sales and inventory reports',
    requiredPlan: 'pro',
    category: 'analytics',
    isEnabled: true
  },
  {
    id: 'pharmacy_reports_section',
    name: 'Pharmacy Reports Section',
    description: 'Advanced pharmacy reporting dashboard',
    requiredPlan: 'pro',
    category: 'analytics',
    isEnabled: true
  },
  {
    id: 'basic_analytics',
    name: 'Basic Analytics',
    description: 'Access to basic analytics and reporting',
    requiredPlan: 'pro',
    category: 'analytics',
    isEnabled: true
  },
  {
    id: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Access to predictive analytics and advanced reporting',
    requiredPlan: 'enterprise',
    category: 'analytics',
    isEnabled: true
  },
  {
    id: 'reports',
    name: 'Reports Dashboard',
    description: 'Access to comprehensive reports and analytics dashboard',
    requiredPlan: 'pro',
    category: 'analytics',
    isEnabled: true
  },
  // Management Features
  {
    id: 'appointments',
    name: 'Appointments',
    description: 'Schedule and manage patient appointments',
    requiredPlan: 'free',
    category: 'management',
    isEnabled: true
  },
  {
    id: 'inventory',
    name: 'Inventory Management',
    description: 'Track medical supplies and equipment',
    requiredPlan: 'free',
    category: 'management',
    isEnabled: true
  },
  {
    id: 'multi_location',
    name: 'Multi-Location Support',
    description: 'Manage multiple clinic locations',
    requiredPlan: 'enterprise',
    category: 'management',
    isEnabled: true
  },
  {
    id: 'medication_batches',
    name: 'Medication Batches',
    description: 'Advanced batch management for medications including expiry tracking and stock movement',
    requiredPlan: 'pro',
    category: 'management',
    isEnabled: true
  },
  // Reporting Features
  {
    id: 'basic_reporting',
    name: 'Basic Reports',
    description: 'Generate basic reports and exports',
    requiredPlan: 'free',
    category: 'reporting',
    isEnabled: true
  },
  {
    id: 'advanced_reporting',
    name: 'Advanced Reports',
    description: 'Advanced reporting and data export capabilities',
    requiredPlan: 'pro',
    category: 'reporting',
    isEnabled: true
  },
  // Integration Features
  {
    id: 'api_access',
    name: 'API Access',
    description: 'Access to the API for custom integrations',
    requiredPlan: 'enterprise',
    category: 'integration',
    isEnabled: true
  },
  // Billing Features
  {
    id: 'basic_billing',
    name: 'Basic Billing',
    description: 'Basic billing and invoicing',
    requiredPlan: 'free',
    category: 'billing',
    isEnabled: true
  },
  {
    id: 'mpesa_integration',
    name: 'M-Pesa Integration',
    description: 'Integrated M-Pesa payments',
    requiredPlan: 'pro',
    category: 'billing',
    isEnabled: true
  },
  {
    id: 'email_notifications',
    name: 'Email Notifications',
    description: 'Automated email notifications',
    requiredPlan: 'pro',
    category: 'management',
    isEnabled: true
  }
]

// Client-side functions
export function getFeatureForPlan(plan: PlanType): Feature[] {
  const planOrder = { free: 0, pro: 1, enterprise: 2 } as const
  return FEATURES.filter(feature => {
    const featurePlanOrder = planOrder[feature.requiredPlan]
    const currentPlanOrder = planOrder[plan]
    return featurePlanOrder <= currentPlanOrder
  })
}

export function getUpgradePrompt(featureId: string): string {
  const feature = FEATURES.find(f => f.id === featureId)
  if (!feature) return ''

  switch (feature.requiredPlan) {
    case 'pro':
      return 'Upgrade to Pro plan to access this feature'
    case 'enterprise':
      return 'Upgrade to Enterprise plan to access this feature'
    default:
      return ''
  }
}

export function getFeatureCategory(featureId: string): Feature['category'] | null {
  const feature = FEATURES.find(f => f.id === featureId)
  return feature?.category || null
}

export function getFeaturesByCategory(category: Feature['category']): Feature[] {
  return FEATURES.filter(feature => feature.category === category)
}

export function getPlanFeatures(plan: PlanType): Record<Feature['category'], Feature[]> {
  const features = getFeatureForPlan(plan)
  return features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = []
    }
    acc[feature.category].push(feature)
    return acc
  }, {} as Record<Feature['category'], Feature[]>)
}

// Add subscription limits helper
export const SUBSCRIPTION_LIMITS = {
  free: {
    max_patients: 50,
    max_appointments_per_month: 100,
    max_inventory_items: 50,
    max_users: 1,
    max_transactions_per_month: 100,
    features: ['appointments', 'inventory', 'basic_reporting', 'basic_billing']
  },
  pro: {
    max_patients: -1, // unlimited
    max_appointments_per_month: -1, // unlimited
    max_inventory_items: -1, // unlimited
    max_users: 5,
    max_transactions_per_month: -1, // unlimited
    features: [
      'appointments',
      'inventory',
      'basic_reporting',
      'basic_billing',
      'basic_analytics',
      'advanced_reporting',
      'mpesa_integration',
      'email_notifications',
      'pharmacy_analytics'
    ]
  },
  enterprise: {
    max_patients: -1, // unlimited
    max_appointments_per_month: -1, // unlimited
    max_inventory_items: -1, // unlimited
    max_users: -1, // unlimited
    max_transactions_per_month: -1, // unlimited
    features: [
      'appointments',
      'inventory',
      'basic_reporting',
      'basic_billing',
      'basic_analytics',
      'advanced_analytics',
      'advanced_reporting',
      'mpesa_integration',
      'email_notifications',
      'pharmacy_analytics',
      'api_access',
      'multi_location'
    ]
  }
} as const

// Server-side helper function
export function hasFeature(tenantId: string, featureId: string): boolean {
  const feature = FEATURES.find(f => f.id === featureId)
  if (!feature) return false
  return true // You would typically check against the tenant's subscription here
} 