import { NextResponse } from 'next/server';
import axios from 'axios';

const paystack = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, email, callback_url, metadata, method } = body;

    if (!metadata?.tenant_id) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Define channels based on payment method
    const channels = method === 'card' 
      ? ['card'] 
      : ['card', 'bank', 'ussd', 'qr', 'mobile_money'];

    // Ensure metadata is properly structured
    const formattedMetadata = {
      ...metadata,
      custom_fields: [
        {
          display_name: "Tenant ID",
          variable_name: "tenant_id",
          value: metadata.tenant_id
        },
        {
          display_name: "Plan",
          variable_name: "plan",
          value: metadata.plan
        }
      ]
    };

    console.log('Initializing payment with metadata:', formattedMetadata);

    const response = await paystack.post('/transaction/initialize', {
      amount: amount * 100, // Convert to kobo
      email,
      callback_url,
      metadata: formattedMetadata,
      channels,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Payment initialization error:', error.response?.data || error);
    return NextResponse.json(
      { error: error.response?.data?.message || 'Failed to initialize payment' },
      { status: error.response?.status || 500 }
    );
  }
} 