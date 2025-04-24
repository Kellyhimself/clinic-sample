'use client';

import { Card, CardContent } from '@/components/ui/card';


interface SalesMetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  colorClass?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  description?: string;
}

export default function SalesMetricCard({
  title,
  value,
  subValue,
  icon,
  colorClass = "from-blue-50 to-blue-100 border-blue-200 text-blue-600",
  trend,
  description,
}: SalesMetricCardProps) {
  return (
    <Card className={`bg-gradient-to-br ${colorClass} shadow-sm overflow-hidden h-full`}>
      <CardContent className="p-2 md:p-3 lg:p-4 flex flex-col items-center text-center h-full justify-center">
        <div className="flex justify-between items-center w-full mb-1 md:mb-2">
          <p className="text-[10px] md:text-xs lg:text-sm font-semibold truncate pr-1">{title}</p>
          {icon}
        </div>
        <p className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold truncate mt-1">{value}</p>
        {subValue && (
          <p className="text-[9px] sm:text-[11px] md:text-sm font-medium truncate mt-1 md:mt-2">{subValue}</p>
        )}
        {trend && (
          <div className="flex items-center justify-center gap-1 mt-1 md:mt-2">
            <span className={`text-[10px] md:text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value}
            </span>
            {description && <span className="text-[8px] md:text-[10px] text-gray-600 truncate">{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 