'use client';

import { Badge } from '@/components/ui/badge';

interface SalesListCardProps<T> {
  item: T;
  title: (item: T) => React.ReactNode;
  subtitle: (item: T) => React.ReactNode;
  status: {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  };
  details?: Array<{
    label: string;
    value: (item: T) => React.ReactNode;
  }>;
  lineItems?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  maxDisplayItems?: number;
  totalAmount: number;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  lineItemClassName?: string;
  detailsClassName?: string;
  badgeClassName?: string;
}

export default function SalesListCard<T>({
  item,
  title,
  subtitle,
  status,
  details = [],
  lineItems = [],
  maxDisplayItems = 2,
  totalAmount,
  className = '',
  titleClassName = '',
  subtitleClassName = '',
  lineItemClassName = '',
  detailsClassName = '',
  badgeClassName = ''
}: SalesListCardProps<T>) {
  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-3 space-y-2 ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className={`font-medium text-sm dark:text-gray-100 ${titleClassName}`}>{title(item)}</div>
          <div className={`text-xs text-gray-500 dark:text-gray-400 ${subtitleClassName}`}>{subtitle(item)}</div>
        </div>
        <Badge variant={status.variant} className={`text-[10px] px-2 py-0.5 ${badgeClassName}`}>
          {status.label}
        </Badge>
      </div>
      
      {lineItems.length > 0 && (
        <div className={`text-xs space-y-1 border-t border-b border-gray-200 dark:border-gray-700 py-2 my-1 ${lineItemClassName}`}>
          {lineItems.slice(0, maxDisplayItems).map((item, index) => (
            <div key={index} className="flex justify-between text-[11px] dark:text-gray-300">
              <span className="truncate max-w-[70%]">{item.quantity}x {item.name}</span>
              <span>KSh {(item.quantity * item.price).toFixed(2)}</span>
            </div>
          ))}
          {lineItems.length > maxDisplayItems && (
            <div className="text-gray-500 dark:text-gray-400 text-center text-[11px] mt-1">
              + {lineItems.length - maxDisplayItems} more items
            </div>
          )}
        </div>
      )}
      
      {details.length > 0 && (
        <div className={`text-xs space-y-1 ${detailsClassName}`}>
          {details.map((detail, index) => (
            <div key={index} className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">{detail.label}:</span>
              <span className="dark:text-gray-300">{detail.value(item)}</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div className={`font-medium text-sm dark:text-gray-100 ${titleClassName}`}>
          Total: KSh {totalAmount.toFixed(2)}
        </div>
      </div>
    </div>
  );
} 