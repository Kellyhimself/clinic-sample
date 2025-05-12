import { TimeframeType } from '@/components/shared/sales/SalesFilterBar';

export function getDateRangeFromTimeframe(timeframe: TimeframeType): { startDate: Date | null; endDate: Date | null } {
  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = now;

  switch (timeframe) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    
    case 'yesterday':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    
    case 'this_week':
      // Get the start of the week (Sunday)
      const day = now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      break;
    
    case 'last_week':
      const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 7);
      const lastWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      startDate = lastWeekStart;
      endDate = lastWeekEnd;
      break;
    
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    
    case 'last_year':
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31);
      break;
    
    case 'all':
    default:
      // For 'all', we don't set any date range
      startDate = null;
      endDate = null;
      break;
  }

  return { startDate, endDate };
} 