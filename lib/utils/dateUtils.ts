import { TimeframeType } from '@/components/shared/sales/SalesFilterBar';

export function getDateRangeFromTimeframe(timeframe: TimeframeType): { startDate: string; endDate: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayStr = today.toISOString();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString();
  
  switch (timeframe) {
    case 'today':
      return { 
        startDate: todayStr, 
        endDate: tomorrowStr 
      };
    
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return { 
        startDate: weekAgo.toISOString(), 
        endDate: tomorrowStr 
      };
    }
    
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      return { 
        startDate: monthAgo.toISOString(), 
        endDate: tomorrowStr 
      };
    }
    
    case 'all':
    default:
      return { startDate: '', endDate: '' };
  }
} 