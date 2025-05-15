import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    console.log('Creating system admin with:', { email, fullName });

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 1. Create the user in auth
    console.log('Step 1: Creating user in auth...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      console.error('Error creating system admin:', authError);
      return NextResponse.json(
        { error: `Failed to create system admin: ${authError.message}` },
        { status: 500 }
      );
    }

    if (!authData.user) {
      console.error('No user data returned from auth signup');
      return NextResponse.json(
        { error: 'No user data returned from auth signup' },
        { status: 500 }
      );
    }

    console.log('User created in auth:', { userId: authData.user.id });

    // 2. Create profile
    console.log('Step 2: Creating profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role: 'admin',
        tenant_id: '0ad5dc59-5ae9-47ba-abae-c22b40c6a325'
      });

    if (profileError) {
      console.error('Error creating system admin profile:', profileError);
      return NextResponse.json(
        { error: `Failed to create system admin profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    console.log('Profile created successfully');

    // 3. Create admin record
    console.log('Step 3: Creating admin record...');
    const { error: adminError } = await supabase
      .from('admins')
      .insert({
        id: authData.user.id,
        user_id: authData.user.id,
        tenant_id: '0ad5dc59-5ae9-47ba-abae-c22b40c6a325',
        department: 'Administration',
        permissions: ['all']
      });

    if (adminError) {
      console.error('Error creating system admin record:', adminError);
      return NextResponse.json(
        { error: `Failed to create system admin record: ${adminError.message}` },
        { status: 500 }
      );
    }

    console.log('Admin record created successfully');

    // 4. Verify the data was created
    console.log('Step 4: Verifying data creation...');
    const { data: verifyProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    const { data: verifyAdmin } = await supabase
      .from('admins')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    console.log('Verification results:', {
      profile: verifyProfile,
      admin: verifyAdmin
    });

    return NextResponse.json({
      message: 'System admin created successfully',
      userId: authData.user.id,
      verification: {
        profile: verifyProfile,
        admin: verifyAdmin
      }
    });

  } catch (error) {
    console.error('Unexpected error creating system admin:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating system admin' },
      { status: 500 }
    );
  }
} 