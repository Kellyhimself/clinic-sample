'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { UsageLimit, getLimitMessage } from "@/app/lib/config/usageLimits";
import { useUsageLimits } from "@/app/lib/hooks/useUsageLimits";
import { useMemo } from "react";

interface UsageLimitAlertProps {
  limitType: string;
  className?: string;
}

export function UsageLimitAlert({ limitType, className }: UsageLimitAlertProps) {
  const { limits, loading, error } = useUsageLimits();
  
  const limit = useMemo(() => limits?.[limitType], [limits, limitType]);
  
  if (loading || error || !limit || limit.isWithinLimit) {
    return null;
  }

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Usage Limit Reached</AlertTitle>
      <AlertDescription>
        {getLimitMessage(limit)}
      </AlertDescription>
    </Alert>
  );
} 