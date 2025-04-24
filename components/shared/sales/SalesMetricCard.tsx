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
    <Card className={`bg-gradient-to-br ${colorClass} shadow-sm overflow-hidden`}>
      <CardContent className="p-2 md:p-3 lg:p-4 flex flex-col">
        <div className="flex justify-between items-center mb-1 md:mb-2">
          <p className="text-[10px] md:text-xs lg:text-sm font-medium truncate pr-1">{title}</p>
          {icon}
        </div>
        <p className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold truncate">{value}</p>
        {subValue && (
          <p className="text-[8px] sm:text-[10px] md:text-xs truncate mt-0.5 md:mt-1">{subValue}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-0.5 md:mt-1">
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