import { Button } from '@/components/ui/button';
import { useUsageLimits, LimitType } from '@/app/lib/hooks/useUsageLimits';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';
import { ReactNode } from 'react';

interface LimitAwareButtonProps {
  children: ReactNode;
  limitType: LimitType;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  type?: 'button' | 'submit' | 'reset';
  loading?: boolean;
  upgradePromptVariant?: 'button' | 'link' | 'card' | 'tooltip';
}

export function LimitAwareButton({
  children,
  limitType,
  onClick,
  disabled = false,
  className = '',
  variant = 'default',
  size = 'default',
  type = 'button',
  loading = false,
  upgradePromptVariant = 'tooltip' // Default to tooltip for better UX on buttons
}: LimitAwareButtonProps) {
  const { limits, loading: limitsLoading } = useUsageLimits();
  
  // Debug logs
  console.log('LimitAwareButton Debug - limitType:', limitType);
  console.log('LimitAwareButton Debug - All Limits:', limits);
  console.log('LimitAwareButton Debug - This Limit:', limits?.[limitType]);
  
  // If we're still loading usage limits or explicitly loading
  if (loading || limitsLoading) {
    console.log('LimitAwareButton Debug - Loading state active');
    return (
      <Button
        variant={variant}
        size={size}
        type={type}
        disabled={true}
        className={className}
      >
        Loading...
      </Button>
    );
  }

  // Check if we've hit the usage limit
  const limit = limits?.[limitType];
  const isLimitReached = limit && !limit.isWithinLimit;
  
  console.log('LimitAwareButton Debug - Is limit reached:', isLimitReached);
  
  // If limit is reached, show upgrade prompt
  if (isLimitReached) {
    console.log('LimitAwareButton Debug - Showing upgrade prompt, button disabled');
    
    // Pass information about the limit into the features array for better context
    const limitFeatures = [
      `Your current plan allows ${limit.limit} ${limitType}`,
      `You've used ${limit.current} out of ${limit.limit}`,
      `Upgrade to get unlimited ${limitType}`
    ];
    
    return (
      <UpgradePrompt
        requiredPlan="pro"
        variant={upgradePromptVariant}
        className={className}
        features={limitFeatures}
      >
        <Button
          variant={variant}
          size={size}
          type={type}
          disabled={true}
          className={className}
        >
          {children}
        </Button>
      </UpgradePrompt>
    );
  }

  // If we have limits data and we're not at the limit, show the normal button
  if (limits) {
    console.log('LimitAwareButton Debug - Normal button, limits within bounds');
    return (
      <Button
        variant={variant}
        size={size}
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={className}
      >
        {children}
      </Button>
    );
  }

  // Fallback to loading state if we don't have limits data yet
  console.log('LimitAwareButton Debug - No limits data, showing loading state');
  return (
    <Button
      variant={variant}
      size={size}
      type={type}
      disabled={true}
      className={className}
    >
      Loading...
    </Button>
  );
} 