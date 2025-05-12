'use client';

import { useState } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { SUBSCRIPTION_LIMITS, type PlanType } from '@/app/lib/config/features/subscriptionFeatures';
import type { Database } from '@/types/supabase';

type SubscriptionLimits = Database['public']['Tables']['subscription_limits']['Insert'];

export default function TenantCreateForm() {
  const [formData, setFormData] = useState({
    name: '',
    plan_type: 'free' as PlanType,
    billing_email: '',
    contact_person: '',
    contact_phone: '',
    admin_email: '',
    admin_name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Create the tenant
      const { data: tenant, error } = await supabase
        .from('tenants')
        .insert({
          name: formData.name,
          plan_type: formData.plan_type,
          billing_email: formData.billing_email || null,
          contact_person: formData.contact_person || null,
          contact_phone: formData.contact_phone || null,
          subscription_status: 'active',
          is_active: true,
        })
        .select('id')
        .single();
        
      if (error) throw error;
      
      if (!tenant) {
        throw new Error('Failed to create tenant');
      }

      // Create subscription limits based on plan type
      const planLimits = SUBSCRIPTION_LIMITS[formData.plan_type];
      const subscriptionLimits: SubscriptionLimits = {
        tenant_id: tenant.id,
        plan_type: formData.plan_type,
        max_patients: planLimits.max_patients,
        max_appointments_per_month: planLimits.max_appointments_per_month,
        max_inventory_items: planLimits.max_inventory_items,
        max_users: planLimits.max_users,
        max_transactions_per_month: planLimits.max_transactions_per_month,
        features: { enabled: [...planLimits.features] }
      };

      console.log('Attempting to insert subscription limits:', subscriptionLimits);

      const { error: limitsError } = await supabase
        .from('subscription_limits')
        .insert(subscriptionLimits);

      if (limitsError) {
        // If limits creation fails, delete the tenant to maintain consistency
        await supabase
          .from('tenants')
          .delete()
          .eq('id', tenant.id);
          
        console.error('Subscription limits error details:', limitsError);
        throw new Error(`Failed to create subscription limits: ${limitsError.message}`);
      }

      // Create admin invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('staff_invitations')
        .insert({
          tenant_id: tenant.id,
          email: formData.admin_email,
          role: 'admin',
          status: 'pending',
          invited_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          metadata: {
            full_name: formData.admin_name,
            is_admin: true
          }
        })
        .select()
        .single();

      if (inviteError) {
        console.error('Staff invitation error details:', inviteError);
        console.error('Attempted to insert:', {
          tenant_id: tenant.id,
          email: formData.admin_email,
          role: 'admin',
          status: 'pending',
          invited_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            full_name: formData.admin_name,
            is_admin: true
          }
        });
        
        // If invitation creation fails, clean up
        await supabase
          .from('subscription_limits')
          .delete()
          .eq('tenant_id', tenant.id);
        await supabase
          .from('tenants')
          .delete()
          .eq('id', tenant.id);
        throw new Error(`Failed to create admin invitation: ${inviteError.message}`);
      }

      // Send invitation email
      const response = await fetch('/api/staff/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitation.id,
          email: formData.admin_email,
          role: 'admin',
          tenantId: tenant.id,
          isAdmin: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send admin invitation email');
      }
      
      // Success! Show toast notification
      toast.success(`Tenant "${formData.name}" created successfully! Admin invitation sent to ${formData.admin_email}`);
      
      // Reset form
      setFormData({
        name: '',
        plan_type: 'free',
        billing_email: '',
        contact_person: '',
        contact_phone: '',
        admin_email: '',
        admin_name: '',
      });
      
      // Refresh the page to show the new tenant
      router.refresh();
    } catch (err: unknown) {
      console.error('Error creating tenant:', err);
      if (err instanceof Error || err instanceof PostgrestError) {
        setError(err.message || 'Failed to create tenant');
        toast.error(`Failed to create tenant: ${err.message}`);
      } else {
        setError('An unknown error occurred');
        toast.error('An unknown error occurred while creating tenant');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Tenant Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      
      <div>
        <label htmlFor="plan_type" className="block text-sm font-medium text-gray-700">
          Plan Type *
        </label>
        <select
          id="plan_type"
          name="plan_type"
          value={formData.plan_type}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <div>
        <label htmlFor="admin_email" className="block text-sm font-medium text-gray-700">
          Admin Email *
        </label>
        <input
          type="email"
          id="admin_email"
          name="admin_email"
          value={formData.admin_email}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="admin_name" className="block text-sm font-medium text-gray-700">
          Admin Full Name *
        </label>
        <input
          type="text"
          id="admin_name"
          name="admin_name"
          value={formData.admin_name}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      
      <div>
        <label htmlFor="billing_email" className="block text-sm font-medium text-gray-700">
          Billing Email
        </label>
        <input
          type="email"
          id="billing_email"
          name="billing_email"
          value={formData.billing_email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      
      <div>
        <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700">
          Contact Person
        </label>
        <input
          type="text"
          id="contact_person"
          name="contact_person"
          value={formData.contact_person}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      
      <div>
        <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
          Contact Phone
        </label>
        <input
          type="text"
          id="contact_phone"
          name="contact_phone"
          value={formData.contact_phone}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isLoading ? 'Creating...' : 'Create Tenant'}
        </button>
      </div>
    </form>
  );
} 