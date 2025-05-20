'use client';

import { useState } from 'react';
import { Tenant } from '@/types/supabase';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';
import { createClient } from '@/app/lib/supabase/client';

interface TenantListProps {
  initialTenants: Tenant[];
}

export default function TenantList({ initialTenants }: TenantListProps) {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  
  const { supabase: authSupabase } = useAuthContext();
  const { tenantId } = useTenant();
  
  // Fallback to direct client creation if auth context is not available
  const supabase = authSupabase || createClient();
  
  const updateTenant = async (tenant: Tenant) => {
    if (!supabase) {
      alert('Database client not initialized');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: tenant.name,
          plan_type: tenant.plan_type,
          subscription_status: tenant.subscription_status,
          billing_email: tenant.billing_email,
          billing_address: tenant.billing_address,
          contact_person: tenant.contact_person,
          contact_phone: tenant.contact_phone,
          max_users: tenant.max_users,
          is_active: tenant.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenant.id);
        
      if (error) throw error;
      
      // Update local state
      setTenants(prev => 
        prev.map(t => t.id === tenant.id ? tenant : t)
      );
      
      setEditingTenant(null);
    } catch (error) {
      console.error('Error updating tenant:', error);
      alert('Failed to update tenant');
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleTenantStatus = async (id: string, currentStatus: boolean) => {
    if (!supabase) {
      alert('Database client not initialized');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setTenants(prev => 
        prev.map(t => t.id === id ? {...t, is_active: !currentStatus} : t)
      );
    } catch (error) {
      console.error('Error toggling tenant status:', error);
      alert('Failed to update tenant status');
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tenants.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                No tenants found
              </td>
            </tr>
          ) : (
            tenants.map(tenant => (
              <tr key={tenant.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {tenant.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${tenant.plan_type === 'free' ? 'bg-gray-100' : 
                      tenant.plan_type === 'pro' ? 'bg-blue-100 text-blue-800' : 
                      'bg-green-100 text-green-800'}`}>
                    {tenant.plan_type.charAt(0).toUpperCase() + tenant.plan_type.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${tenant.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {tenant.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tenant.contact_person || 'N/A'}<br />
                  {tenant.billing_email || 'No email'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(tenant.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => setEditingTenant(tenant)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                    disabled={isLoading}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleTenantStatus(tenant.id, tenant.is_active)}
                    className={`${tenant.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                    disabled={isLoading}
                  >
                    {tenant.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      
      {editingTenant && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Tenant</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateTenant(editingTenant);
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editingTenant.name}
                  onChange={(e) => setEditingTenant({...editingTenant, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Plan Type</label>
                <select
                  value={editingTenant.plan_type}
                  onChange={(e) => setEditingTenant({...editingTenant, plan_type: e.target.value as 'free' | 'pro' | 'enterprise'})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Subscription Status</label>
                <select
                  value={editingTenant.subscription_status || 'inactive'}
                  onChange={(e) => setEditingTenant({...editingTenant, subscription_status: e.target.value as 'active' | 'inactive' | 'past_due' | 'canceled' | null})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Billing Email</label>
                <input
                  type="email"
                  value={editingTenant.billing_email || ''}
                  onChange={(e) => setEditingTenant({...editingTenant, billing_email: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                <input
                  type="text"
                  value={editingTenant.contact_person || ''}
                  onChange={(e) => setEditingTenant({...editingTenant, contact_person: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                <input
                  type="text"
                  value={editingTenant.contact_phone || ''}
                  onChange={(e) => setEditingTenant({...editingTenant, contact_phone: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Max Users</label>
                <input
                  type="number"
                  value={editingTenant.max_users || 1}
                  onChange={(e) => setEditingTenant({...editingTenant, max_users: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  min="1"
                />
              </div>
              
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingTenant.is_active}
                  onChange={(e) => setEditingTenant({...editingTenant, is_active: e.target.checked})}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 