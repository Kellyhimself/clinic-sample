'use client';

import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type TimeframeType = 'all' | 'today' | 'week' | 'month';

interface SalesFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  timeframe: TimeframeType;
  onTimeframeChange: (timeframe: TimeframeType) => void;
  additionalFilters?: React.ReactNode;
  customClasses?: {
    searchInput?: string;
    timeframeSelect?: string;
    button?: string;
    filterItem?: string;
  };
}

export default function SalesFilterBar({
  searchTerm,
  onSearchChange,
  timeframe,
  onTimeframeChange,
  additionalFilters,
  customClasses = {}
}: SalesFilterBarProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:gap-4">
      <Tabs 
        value={timeframe}
        onValueChange={(value) => onTimeframeChange(value as TimeframeType)}
        className={`w-full lg:w-auto ${customClasses.timeframeSelect || ''}`}
      >
        <TabsList className={`grid grid-cols-4 w-full max-w-full lg:max-w-md h-8 md:h-10 px-0 bg-gradient-to-br from-blue-50 to-teal-50 border-blue-200 ${customClasses.filterItem || ''}`}>
          <TabsTrigger 
            value="all" 
            className={`text-[10px] md:text-xs lg:text-sm px-0 md:px-2 text-gray-600 data-[state=active]:bg-white data-[state=active]:text-blue-600 ${customClasses.button || ''}`}
          >
            All Time
          </TabsTrigger>
          <TabsTrigger 
            value="today" 
            className={`text-[10px] md:text-xs lg:text-sm px-0 md:px-2 text-gray-600 data-[state=active]:bg-white data-[state=active]:text-blue-600 ${customClasses.button || ''}`}
          >
            Today
          </TabsTrigger>
          <TabsTrigger 
            value="week" 
            className={`text-[10px] md:text-xs lg:text-sm px-0 md:px-2 text-gray-600 data-[state=active]:bg-white data-[state=active]:text-blue-600 ${customClasses.button || ''}`}
          >
            This Week
          </TabsTrigger>
          <TabsTrigger 
            value="month" 
            className={`text-[10px] md:text-xs lg:text-sm px-0 md:px-2 text-gray-600 data-[state=active]:bg-white data-[state=active]:text-blue-600 ${customClasses.button || ''}`}
          >
            This Month
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col md:flex-row gap-2 md:gap-4 mt-3 lg:mt-0">
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full md:w-64 text-xs md:text-sm h-9 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 ${customClasses.searchInput || ''}`}
        />
        {additionalFilters}
      </div>
    </div>
  );
}

// Helper function to calculate date ranges based on timeframe
export function getDateRangeFromTimeframe(timeframe: TimeframeType): { startDate: string; endDate: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayStr = today.toISOString().split('T')[0];
  
  switch (timeframe) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr };
    
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return { 
        startDate: weekAgo.toISOString().split('T')[0], 
        endDate: todayStr 
      };
    }
    
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      return { 
        startDate: monthAgo.toISOString().split('T')[0], 
        endDate: todayStr 
      };
    }
    
    case 'all':
    default:
      return { startDate: '', endDate: '' };
  }
} 