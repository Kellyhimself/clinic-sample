import { Button } from '@/components/ui/button';
import { usePreemptiveLimits } from '@/app/lib/hooks/usePreemptiveLimits';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';
import { ReactNode, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LimitType } from '@/app/lib/config/usageLimits';

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
  skipLoadingState?: boolean;
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
  upgradePromptVariant = 'tooltip',
  skipLoadingState = false
}: LimitAwareButtonProps) {
  const { limits, loading: limitsLoading, error, isLimitValid, refetch } = usePreemptiveLimits();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  // Memoize the limit check to prevent unnecessary re-renders
  const limit = useMemo(() => limits?.[limitType], [limits, limitType]);
  const isLimitReached = useMemo(() => limit && !limit.isWithinLimit, [limit]);
  
  // Handle loading states - skip if requested
  const isLoading = skipLoadingState ? false : (loading || limitsLoading);
  
  // Handle error state
  if (error) {
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

  // Show loading state only if not skipped
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
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
      >
        <Button
          variant={variant}
          size={size}
          type={type}
          disabled={true}
          className={className}
          onClick={() => setShowUpgradePrompt(true)}
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