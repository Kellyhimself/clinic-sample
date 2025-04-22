import { NextResponse } from 'next/server';
import { createGuestPatient } from '@/lib/authActions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate the required fields
    if (!body.full_name || !body.phone_number) {
      return NextResponse.json(
        { success: false, message: 'Full name and phone number are required' },
        { status: 400 }
      );
    }
    
    // Create the guest patient
    const patient = await createGuestPatient({
      full_name: body.full_name,
      phone_number: body.phone_number,
      email: body.email,
      date_of_birth: body.date_of_birth,
      gender: body.gender,
      address: body.address
    });
    
    return NextResponse.json({
      success: true,
      patient
    });
  } catch (error) {
    console.error('Error creating guest patient:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
} 