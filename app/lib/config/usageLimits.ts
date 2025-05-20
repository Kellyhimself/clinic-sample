export type PlanType = 'free' | 'pro' | 'enterprise';

export type LimitType = 'patients' | 'appointments' | 'inventory' | 'users' | 'transactions';

export interface UsageLimit {
  type: LimitType;
  current: number;
  limit: number;
  isWithinLimit: boolean;
}

export const PLAN_LIMITS: Record<PlanType, Record<LimitType, number>> = {
  free: {
    patients: 50,
    appointments: 100,
    inventory: 50,
    users: 1,
    transactions: 50
  },
  pro: {
    patients: -1, // unlimited
    appointments: -1,
    inventory: -1,
    users: 5,
    transactions: -1
  },
  enterprise: {
    patients: -1,
    appointments: -1,
    inventory: -1,
    users: -1,
    transactions: -1
  }
};

export function getLimitForPlan(planType: PlanType, limitType: LimitType): number {
  return PLAN_LIMITS[planType][limitType];
}

export function isWithinLimit(current: number, limit: number): boolean {
  return limit === -1 || current < limit;
}

export function getLimitMessage(limit: UsageLimit): string {
  if (limit.limit === -1) {
    return 'Unlimited';
  }
  
  const percentage = Math.round((limit.current / limit.limit) * 100);
  if (percentage >= 90) {
    return `You have reached ${percentage}% of your ${limit.type} limit (${limit.current}/${limit.limit}). Please upgrade your plan to continue.`;
  }
  return `You have used ${limit.current} of ${limit.limit} ${limit.type}.`;
} 