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
    <Card className={`bg-gradient-to-br ${colorClass} shadow-sm`}>
      <CardContent className="p-3 md:p-4 flex flex-col">
        <div className="flex justify-between items-center mb-1 md:mb-2">
          <p className="text-xs md:text-sm font-medium">{title}</p>
          {icon}
        </div>
        <p className="text-sm md:text-xl lg:text-2xl font-bold">{value}</p>
        {subValue && (
          <p className="text-[10px] md:text-xs mt-1">{subValue}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value}
            </span>
            {description && <span className="text-[10px] md:text-xs text-gray-600">{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 