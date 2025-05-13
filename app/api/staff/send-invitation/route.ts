import { createClient } from '@/app/lib/supabase/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { PLAN_LIMITS } from '@/app/lib/config/usageLimits';
import { SupabaseClient } from '@supabase/supabase-js';
import { sendInvitationEmail } from '@/app/lib/email';

// Helper function to count current users for a tenant
async function countTenantUsers(supabase: SupabaseClient, tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
    
  if (error) {
    throw new Error(`Failed to count users: ${error.message}`);
  }
  
  return count || 0;
}

// Helper function to get the tenant's plan
async function getTenantPlan(supabase: SupabaseClient, tenantId: string): Promise<string> {
  const { data, error } = await supabase
    .from('tenants')
    .select('plan_type')
    .eq('id', tenantId)
    .single();
    
  if (error || !data) {
    throw new Error(`Failed to get tenant plan: ${error?.message || 'Tenant not found'}`);
  }
  
  return data.plan_type;
}

export async function POST(request: Request) {
  try {
    // Initialize Supabase clients
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get the request data
    const reqData = await request.json();
    const { email, role, metadata, tenantId } = reqData;

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's profile to check their role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, tenant_id, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Only admins can send invitations.' }, { status: 401 });
    }

    // Use the profile's tenant_id if tenantId is not provided
    const targetTenantId = tenantId || profile.tenant_id;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 400 });
    }

    // Count current users for the tenant
    const currentUserCount = await countTenantUsers(supabase, targetTenantId);
    
    // Get the tenant's plan type
    const planType = await getTenantPlan(supabase, targetTenantId);
    
    // Get the user limit for the plan
    const userLimit = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS]?.users || 1;
    
    // Check if the limit has been reached
    const isWithinLimit = userLimit === -1 || currentUserCount < userLimit;
    
    // Pro and Enterprise plans have higher or unlimited users
    const isProOrEnterprise = planType === 'pro' || planType === 'enterprise';

    if (!isProOrEnterprise && !isWithinLimit) {
      return NextResponse.json(
        { 
          error: 'User limit reached. Please upgrade your plan to add more users.',
          current: currentUserCount,
          limit: userLimit
        },
        { status: 403 }
      );
    }

    // Generate unique invitation ID
    const invitationId = crypto.randomUUID();
    
    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    console.log('Creating invitation with:', {
      id: invitationId,
      email,
      role,
      tenant_id: targetTenantId,
      expires_at: expiresAt.toISOString()
    });

    // Insert the invitation record using admin client
    const { data: invitationData, error: invitationError } = await adminClient
      .from('staff_invitations')
      .insert({
        id: invitationId,
        email,
        role,
        tenant_id: targetTenantId,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        metadata
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Failed to create invitation:', invitationError);
      return NextResponse.json({ error: `Failed to create invitation: ${invitationError.message}` }, { status: 500 });
    }

    console.log('Invitation created successfully:', invitationData);

    // Get tenant details for the email
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', targetTenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Generate invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/signup?token=${invitationId}&role=${role}&email=${encodeURIComponent(email)}`;

    // Send invitation email using the email service
    await sendInvitationEmail({
      to: email,
      invitationLink,
      tenantName: tenant.name,
      role,
      invitedBy: profile.full_name
    });

    return NextResponse.json({ 
      success: true,
      invitation: {
        id: invitationId,
        email,
        role,
        expires_at: expiresAt
      }
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invitation' },
      { status: 500 }
    );
  }
} 