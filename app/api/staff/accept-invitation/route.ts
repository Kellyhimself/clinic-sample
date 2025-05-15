import { NextRequest, NextResponse } from 'next/server';
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
  fullName: string,
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
          full_name: fullName,
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
    console.log('Starting invitation acceptance process...');
    const formData = await request.formData();
    const token = formData.get('token') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const email = formData.get('email') as string;
    const metadata = {
      licenseNumber: formData.get('licenseNumber') as string,
      specialty: formData.get('specialty') as string,
      specialization: formData.get('specialization') as string,
      department: formData.get('department') as string,
      permissions: formData.get('permissions') ? JSON.parse(formData.get('permissions') as string) : []
    };

    console.log('Form data received:', { email, role: formData.get('role'), token });

    // Initialize Supabase clients
    const adminClient = createAdminClient();

    // Verify the invitation token
    console.log('Verifying invitation token...');
    const { data: invitation, error: verifyError } = await adminClient
      .from('staff_invitations')
      .select('*')
      .eq('id', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .eq('email', email)
      .single();

    if (verifyError) {
      console.error('Invitation verification error:', verifyError);
      if (verifyError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Invitation not found or has expired' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to verify invitation' },
        { status: 500 }
      );
    }

    if (!invitation) {
      console.error('No invitation found for:', { token, email });
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      );
    }

    console.log('Invitation verified:', { role: invitation.role, tenant_id: invitation.tenant_id });

    // Check if user already exists
    console.log('Checking for existing user...');
    const { data: existingUser, error: userCheckError } = await adminClient.auth.admin.listUsers({
      filters: {
        email: invitation.email
      }
    });

    if (userCheckError) {
      console.error('User check error:', userCheckError);
      return NextResponse.json(
        { error: 'Failed to check existing user' },
        { status: 500 }
      );
    }

    let authData;
    if (existingUser?.users && existingUser.users.length > 0) {
      console.log('Updating existing user...');
      const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
        existingUser.users[0].id,
        {
          password,
          email_confirm: true,
          email: invitation.email,
          user_metadata: {
            full_name: fullName,
            tenant_id: invitation.tenant_id
          }
        }
      );

      if (updateError) {
        console.error('User update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update existing user' },
          { status: 500 }
        );
      }

      authData = { user: updateData.user };
    } else {
      console.log('Creating new user...');
      const { data: newUserData, error: authError } = await adminClient.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          tenant_id: invitation.tenant_id
        }
      });

      if (authError) {
        console.error('User creation error:', authError);
        return NextResponse.json(
          { error: authError.message || 'Failed to create user account' },
          { status: 500 }
        );
      }

      authData = newUserData;
    }

    console.log('User created/updated successfully:', { userId: authData.user.id });

    // Create or update profile
    console.log('Creating/updating profile...');
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: invitation.email,
        full_name: fullName,
        role: invitation.role,
        tenant_id: invitation.tenant_id,
        phone_number: phoneNumber,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile creation error:', {
        error: profileError,
        data: {
          id: authData.user.id,
          email: invitation.email,
          role: invitation.role,
          tenant_id: invitation.tenant_id
        }
      });
      return NextResponse.json(
        { error: `Failed to create/update user profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    console.log('Profile created/updated successfully');

    // Create role-specific record
    console.log('Creating role-specific record...');
    const { error: roleError } = await createRoleSpecificRecord(
      adminClient,
      authData.user.id,
      invitation.tenant_id,
      invitation.role,
      fullName,
      metadata
    );

    if (roleError) {
      console.error('Role-specific record creation error:', roleError);
      // Clean up if role-specific record creation fails
      await adminClient.from('profiles').delete().eq('id', authData.user.id);
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: `Failed to create ${invitation.role} record: ${roleError.message}` },
        { status: 500 }
      );
    }

    console.log('Role-specific record created successfully');

    // Update invitation status
    console.log('Updating invitation status...');
    const { error: updateError } = await adminClient
      .from('staff_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Failed to update invitation status:', updateError);
      // Don't fail the request if this fails, as the user is already created
    }

    console.log('Invitation process completed successfully');
    // Return success response with redirect flag
    return NextResponse.json({
      success: true,
      user: authData.user,
      role: invitation.role,
      tenant_id: invitation.tenant_id,
      redirect: '/login'
    });
  } catch (error) {
    console.error('Unexpected error in invitation acceptance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 