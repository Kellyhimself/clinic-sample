import { FEATURES, PlanType } from '@/app/lib/config/features/subscriptionFeatures';

export function isFeatureEnabled(featureId: string, currentPlan: PlanType): boolean {
  const feature = FEATURES.find(f => f.id === featureId);
  if (!feature) return false;

  // Check if the feature is enabled and if the current plan meets the requirement
  const planOrder = { free: 0, pro: 1, enterprise: 2 } as const;
  const featurePlanOrder = planOrder[feature.requiredPlan];
  const currentPlanOrder = planOrder[currentPlan];

  return feature.isEnabled && currentPlanOrder >= featurePlanOrder;
}

export function getFeatureDetails(featureId: string, currentPlan: PlanType) {
  const feature = FEATURES.find(f => f.id === featureId);
  if (!feature) return null;

  const isEnabled = isFeatureEnabled(featureId, currentPlan);

  return {
    name: feature.name,
    enabled: isEnabled,
    description: feature.description,
    requiredPlan: feature.requiredPlan
  };
} 