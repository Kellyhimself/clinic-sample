import { NextResponse } from 'next/server';
import { initializeTransaction } from '@/lib/paystack';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, email, callback_url, metadata } = body;

    const response = await initializeTransaction({
      amount,
      email,
      callback_url,
      metadata
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Paystack initialization error:', error);
    return NextResponse.json(
      { 
        error: error.message,
        details: error.response?.data 
      },
      { status: error.response?.status || 500 }
    );
  }
} 