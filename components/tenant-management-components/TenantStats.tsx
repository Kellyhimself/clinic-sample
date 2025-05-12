'use client';

import { useMemo } from 'react';
import { Tenant } from '@/types/supabase';

interface TenantStatsProps {
  tenants: Tenant[];
}

export default function TenantStats({ tenants }: TenantStatsProps) {
  const stats = useMemo(() => {
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.is_active).length;
    const inactiveTenants = totalTenants - activeTenants;
    
    const planCounts = {
      free: tenants.filter(t => t.plan_type === 'free').length,
      pro: tenants.filter(t => t.plan_type === 'pro').length,
      enterprise: tenants.filter(t => t.plan_type === 'enterprise').length,
    };
    
    const subscriptionCounts = {
      active: tenants.filter(t => t.subscription_status === 'active').length,
      inactive: tenants.filter(t => t.subscription_status === 'inactive').length,
      past_due: tenants.filter(t => t.subscription_status === 'past_due').length,
      canceled: tenants.filter(t => t.subscription_status === 'canceled').length,
    };
    
    return {
      totalTenants,
      activeTenants,
      inactiveTenants,
      planCounts,
      subscriptionCounts,
    };
  }, [tenants]);
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">Total Tenants</div>
          <div className="text-2xl font-bold">{stats.totalTenants}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">Active Tenants</div>
          <div className="text-2xl font-bold text-green-600">{stats.activeTenants}</div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Plan Distribution</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Free</span>
            <span className="font-medium">{stats.planCounts.free}</span>
          </div>
          <div className="flex justify-between">
            <span>Pro</span>
            <span className="font-medium">{stats.planCounts.pro}</span>
          </div>
          <div className="flex justify-between">
            <span>Enterprise</span>
            <span className="font-medium">{stats.planCounts.enterprise}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Subscription Status</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Active</span>
            <span className="font-medium">{stats.subscriptionCounts.active}</span>
          </div>
          <div className="flex justify-between">
            <span>Inactive</span>
            <span className="font-medium">{stats.subscriptionCounts.inactive}</span>
          </div>
          <div className="flex justify-between">
            <span>Past Due</span>
            <span className="font-medium">{stats.subscriptionCounts.past_due}</span>
          </div>
          <div className="flex justify-between">
            <span>Canceled</span>
            <span className="font-medium">{stats.subscriptionCounts.canceled}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 