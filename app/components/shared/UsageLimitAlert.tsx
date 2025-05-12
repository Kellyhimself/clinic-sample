'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { UsageLimit } from "@/app/lib/config/usageLimits";
import { getLimitMessage } from "@/app/lib/config/usageLimits";

interface UsageLimitAlertProps {
  limit: UsageLimit;
  className?: string;
}

export function UsageLimitAlert({ limit, className }: UsageLimitAlertProps) {
  if (limit.isWithinLimit) {
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