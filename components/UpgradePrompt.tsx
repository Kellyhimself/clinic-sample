import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UpgradePromptProps {
  requiredPlan: 'pro' | 'enterprise';
  variant?: 'tooltip' | 'dialog';
  className?: string;
  children: React.ReactNode;
  limitType?: string;
  currentUsage?: number;
  maxLimit?: number;
}

export function UpgradePrompt({ 
  requiredPlan, 
  variant = 'dialog', 
  className, 
  children,
  limitType,
  currentUsage,
  maxLimit
}: UpgradePromptProps) {
  if (variant === 'tooltip') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('relative cursor-not-allowed', className)}>
              {children}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs font-medium">
              {limitType && currentUsage !== undefined && maxLimit !== undefined ? (
                <>Limit reached: {currentUsage}/{maxLimit} {limitType}</>
              ) : (
                <>Upgrade to {requiredPlan} plan required</>
              )}
            </p>
            <p className="text-xs mt-1">Click to upgrade your plan</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className={cn('cursor-pointer', className)}>
          {children}
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade Required</DialogTitle>
          <DialogDescription>
            {limitType && currentUsage !== undefined && maxLimit !== undefined ? (
              <>
                You've reached the limit of {maxLimit} {limitType} on your current plan.
                Upgrade to {requiredPlan} plan to {maxLimit === 1 ? 'add more' : 'get unlimited'} {limitType}.
              </>
            ) : (
              <>This feature is available on the {requiredPlan} plan. Upgrade your subscription to access this feature.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => window.location.href = '/settings/billing'}>
            Upgrade Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { UpgradePrompt } 
 