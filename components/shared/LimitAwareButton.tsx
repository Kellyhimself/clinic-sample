import { Button } from '@/components/ui/button';
import { useUsageLimits, LimitType } from '@/app/lib/hooks/useUsageLimits';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';
import { ReactNode, useMemo } from 'react';
import { Loader2 } from 'lucide-react';

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
  upgradePromptVariant = 'tooltip'
}: LimitAwareButtonProps) {
  const { limits, loading: limitsLoading, error, retryCount, refetch } = useUsageLimits();
  
  // Memoize the limit check to prevent unnecessary re-renders
  const limit = useMemo(() => limits?.[limitType], [limits, limitType]);
  const isLimitReached = useMemo(() => limit && !limit.isWithinLimit, [limit]);
  
  // Handle loading states
  const isLoading = loading || limitsLoading;
  
  // Handle error state
  if (error && retryCount >= 3) {
    return (
      <Button
        variant={variant}
        size={size}
        type={type}
        disabled={true}
        className={className}
        onClick={() => refetch()}
      >
        Error loading limits. Click to retry.
      </Button>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <Button
        variant={variant}
        size={size}
        type={type}
        disabled={true}
        className={className}
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  // If limit is reached, show upgrade prompt
  if (isLimitReached) {
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

  // Normal button state
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