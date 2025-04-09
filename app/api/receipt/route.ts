import { generateReceipt } from '@/lib/authActions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appointmentId = searchParams.get('appointmentId');

  if (!appointmentId) {
    return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
  }

  try {
    const receipt = await generateReceipt(appointmentId);
    return new NextResponse(receipt, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch (error: unknown) {
    // Safely handle the unknown type
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to generate receipt: ${errorMessage}` }, { status: 500 });
  }
}