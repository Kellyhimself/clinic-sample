'use client';

import { useState, useEffect } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUsageLimits } from '@/app/lib/hooks/useUsageLimits';
import { useSubscription } from '@/app/lib/hooks/useSubscription';
import { getFeatureDetails } from '@/app/lib/utils/featureCheck';
import { UsageLimitAlert } from '@/components/shared/UsageLimitAlert';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: 'active' | 'pending';
  invited_at?: string;
}

interface StaffInvitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  invited_at: string;
  expires_at: string;
}

interface StaffManagementProps {
  tenantId?: string;
}

export default function StaffManagement({ tenantId }: StaffManagementProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [newInvitation, setNewInvitation] = useState({
    email: '',
    role: 'staff'
  });
  const { checkUsage } = useUsageLimits();
  const [usageLimit, setUsageLimit] = useState<{ allowed: boolean; current: number; limit: number } | null>(null);
  const { subscription } = useSubscription();
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(true);
  const [isAdvancedEnabled, setIsAdvancedEnabled] = useState(false);
  const [isEnterpriseEnabled, setIsEnterpriseEnabled] = useState(false);

  const supabase = createClientSupabaseClient();

  // Fetch staff and invitations
  useEffect(() => {
    fetchStaffAndInvitations();
    checkUserLimit();
    const feature = getFeatureDetails('staff_management', subscription?.plan || 'free');
    setIsFeatureEnabled(feature?.enabled === true);

    // Check advanced staff feature
    const advancedFeature = getFeatureDetails('advanced_staff', subscription?.plan || 'free');
    setIsAdvancedEnabled(advancedFeature?.enabled === true);

    // Check enterprise staff feature
    const enterpriseFeature = getFeatureDetails('enterprise_staff', subscription?.plan || 'free');
    setIsEnterpriseEnabled(enterpriseFeature?.enabled === true);
    
    // Log feature details for debugging
    console.log('Feature details:', {
      feature,
      enabled: feature?.enabled,
      requiredPlan: feature?.requiredPlan,
      currentPlan: subscription?.plan
    });
  }, [tenantId, subscription]);

  const checkUserLimit = async () => {
    try {
      const limit = await checkUsage('users');
      const feature = getFeatureDetails('unlimited_users');
      const isProOrEnterprise = feature?.requiredPlan === 'pro' || feature?.requiredPlan === 'enterprise';
      
      if (isProOrEnterprise) {
        setUsageLimit({
          allowed: true,
          current: limit.current,
          limit: -1 // -1 indicates unlimited
        });
        return;
      }

      setUsageLimit({
        allowed: limit.remaining > 0,
        current: limit.current,
        limit: limit.limit
      });
    } catch (error) {
      console.error('Error checking usage limit:', error);
    }
  };

  const fetchStaffAndInvitations = async () => {
    try {
      setLoading(true);
      
      // Fetch current staff
      const { data: staffData, error: staffError } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('role', 'admin');

      if (staffError) throw staffError;
      setStaff(staffData || []);

      // Fetch pending invitations
      const { data: invitationData, error: invitationError } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending');

      if (invitationError) throw invitationError;
      setInvitations(invitationData || []);
    } catch (error) {
      console.error('Error fetching staff data:', error);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (usageLimit && !usageLimit.allowed) {
      toast.error('User limit reached. Please upgrade your plan to add more users.');
      return;
    }

    setInviting(true);

    try {
      // Create invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from('staff_invitations')
        .insert({
          tenant_id: tenantId,
          email: newInvitation.email,
          role: newInvitation.role,
          status: 'pending',
          invited_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Send invitation email
      const response = await fetch('/api/staff/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitation.id,
          email: newInvitation.email,
          role: newInvitation.role,
          tenantId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation email');
      }

      toast.success(`Invitation sent to ${newInvitation.email}`);
      setNewInvitation({ email: '', role: 'staff' });
      fetchStaffAndInvitations();
      checkUserLimit(); // Refresh usage limit after inviting
    } catch (error) {
      console.error('Error inviting staff:', error);
      toast.error('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const invitation = invitations.find(inv => inv.id === invitationId);
      if (!invitation) return;

      const response = await fetch('/api/staff/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId,
          email: invitation.email,
          role: invitation.role,
          tenantId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend invitation');
      }

      toast.success(`Invitation resent to ${invitation.email}`);
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('staff_invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation revoked');
      fetchStaffAndInvitations();
      checkUserLimit(); // Refresh usage limit after revoking
    } catch (error) {
      console.error('Error revoking invitation:', error);
      toast.error('Failed to revoke invitation');
    }
  };

  return (
    <div className="space-y-6">
      {/* Usage Limit Alert */}
      {usageLimit && !usageLimit.allowed && (
        <UsageLimitAlert
          limit={{
            type: 'users',
            current: usageLimit.current,
            limit: usageLimit.limit,
            isWithinLimit: usageLimit.allowed
          }}
          className="mb-4"
        />
      )}

      {/* Invite New Staff Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Invite New Staff</h2>
        <form onSubmit={handleInviteStaff} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={newInvitation.email}
              onChange={(e) => setNewInvitation(prev => ({ ...prev, email: e.target.value }))}
              required
              placeholder="staff@example.com"
              disabled={usageLimit && !usageLimit.allowed}
            />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              value={newInvitation.role}
              onValueChange={(value) => setNewInvitation(prev => ({ ...prev, role: value }))}
              disabled={usageLimit && !usageLimit.allowed}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="pharmacist">Pharmacist</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            type="submit" 
            disabled={inviting || (usageLimit && !usageLimit.allowed)}
          >
            {inviting ? 'Sending Invitation...' : 'Send Invitation'}
          </Button>
        </form>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Pending Invitations</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell>{invitation.email}</TableCell>
                  <TableCell className="capitalize">{invitation.role}</TableCell>
                  <TableCell>{new Date(invitation.invited_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvitation(invitation.id)}
                        disabled={usageLimit && !usageLimit.allowed}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Current Staff */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Current Staff</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.full_name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell className="capitalize">{member.role}</TableCell>
                <TableCell className="capitalize">{member.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 