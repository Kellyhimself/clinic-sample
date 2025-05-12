import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

type RoleMetadata = {
  license_number?: string;
  specialization?: string;
  department?: string;
};

// Helper function to create role-specific records
async function createRoleSpecificRecord(
  supabase: SupabaseClient<Database>,
  userId: string,
  tenantId: string,
  role: string,
  metadata: RoleMetadata = {}
) {
  switch (role) {
    case 'admin':
      return await supabase
        .from('admins')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          permissions: ['all'],
          department: 'Administration'
        });
    
    case 'pharmacist':
      return await supabase
        .from('pharmacists')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          license_number: metadata.license_number || 'PENDING',
          specialization: metadata.specialization || 'General',
          department: metadata.department || 'Pharmacy'
        });
    
    case 'doctor':
      return await supabase
        .from('doctors')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          license_number: metadata.license_number || 'PENDING',
          specialty: metadata.specialization || 'General',
          department: metadata.department || 'Medical'
        });
    
    case 'cashier':
      return await supabase
        .from('cashiers')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          department: metadata.department || 'Finance'
        });
    
    default:
      return { error: null }; // No role-specific table for other roles
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, password, full_name, metadata = {} } = await request.json();

    // Initialize Supabase clients
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Verify the invitation token by checking the staff_invitations table
    const { data: invitation, error: verifyError } = await supabase
      .from('staff_invitations')
      .select('*')
      .eq('metadata->>token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (verifyError || !invitation) {
      console.error('Token verification error:', verifyError);
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await adminClient.auth.admin.listUsers({
      filters: {
        email: invitation.email
      }
    });

    if (userCheckError) {
      console.error('Error checking existing user:', userCheckError);
      return NextResponse.json(
        { error: 'Failed to check existing user' },
        { status: 500 }
      );
    }

    let authData;
    if (existingUser?.users && existingUser.users.length > 0) {
      // User exists, update their password and metadata
      const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
        existingUser.users[0].id,
        {
          password,
          user_metadata: {
            full_name,
            tenant_id: invitation.tenant_id
          }
        }
      );

      if (updateError) {
        console.error('Error updating existing user:', updateError);
        return NextResponse.json(
          { error: 'Failed to update existing user' },
          { status: 500 }
        );
      }

      authData = { user: updateData.user };
    } else {
      // Create new user
      const { data: newUserData, error: authError } = await adminClient.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          tenant_id: invitation.tenant_id
        }
      });

      if (authError) {
        console.error('Auth error details:', authError);
        return NextResponse.json(
          { error: authError.message || 'Failed to create user account' },
          { status: 500 }
        );
      }

      authData = newUserData;
    }

    // Create or update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: invitation.email,
        full_name,
        role: invitation.role,
        tenant_id: invitation.tenant_id,
        phone_number: '+254000000000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile creation/update error:', profileError);
      return NextResponse.json(
        { error: 'Failed to create/update user profile' },
        { status: 500 }
      );
    }

    // Create role-specific record
    const { error: roleError } = await createRoleSpecificRecord(
      supabase,
      authData.user.id,
      invitation.tenant_id,
      invitation.role,
      metadata
    );

    if (roleError) {
      // Clean up if role-specific record creation fails
      await supabase.from('profiles').delete().eq('id', authData.user.id);
      await adminClient.auth.admin.deleteUser(authData.user.id);
      console.error('Role-specific record creation error:', roleError);
      return NextResponse.json(
        { error: `Failed to create ${invitation.role} record` },
        { status: 500 }
      );
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('staff_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Failed to update invitation status:', updateError);
      // Don't fail the request if this fails, as the user is already created
    }

    // Return success response with redirect flag
    return NextResponse.json({
      success: true,
      user: authData.user,
      role: invitation.role,
      tenant_id: invitation.tenant_id,
      redirect: '/login'
    });
  } catch (error) {
    console.error('Error in accept-invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 