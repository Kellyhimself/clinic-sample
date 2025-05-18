'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthContext } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';

interface UpgradePromptProps {
  requiredPlan: 'pro' | 'enterprise';
  variant?: 'tooltip' | 'dialog';
  className?: string;
  children: React.ReactNode;
  features?: string[];
}

export function UpgradePrompt({ 
  requiredPlan, 
  variant = 'dialog', 
  className, 
  children,
  features = []
}: UpgradePromptProps) {
  const { user } = useAuthContext();
  const { tenantId } = useTenant();

  const handleUpgrade = () => {
    // Redirect to billing page with upgrade parameters
    window.location.href = `/settings/billing?plan=${requiredPlan}&tenant=${tenantId}`;
  };

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
            <div className="text-xs font-medium">
              Upgrade to {requiredPlan} plan required
            </div>
            {features.length > 0 && (
              <ul className="text-xs mt-1 space-y-1">
                {features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            )}
            <div className="text-xs mt-1">Click to upgrade your plan</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className={cn('cursor-pointer group relative', className)}>
          {children}
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-center p-4">
              <div className="text-sm font-medium text-gray-800">Available on {requiredPlan} plan</div>
              {features.length > 0 && (
                <ul className="text-xs mt-2 space-y-1 text-gray-600">
                  {features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade Required</DialogTitle>
          <DialogDescription>
            {features.length > 0 ? (
              <div className="space-y-2">
                <div>This feature is available on the {requiredPlan} plan. Upgrade your subscription to access:</div>
                <ul className="list-disc pl-4 space-y-1">
                  {features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div>This feature is available on the {requiredPlan} plan. Upgrade your subscription to access this feature.</div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleUpgrade}>
            Upgrade Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 