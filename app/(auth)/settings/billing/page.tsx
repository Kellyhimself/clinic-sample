'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/app/lib/auth/client';
import { toast } from 'sonner';
import { CreditCard, Loader2, Check, Wallet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter, useSearchParams } from 'next/navigation';
import { initializeTransaction } from '@/lib/paystack';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const plans = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      'Basic patient management',
      'Up to 100 patient records',
      'Basic appointment scheduling',
      'Email support'
    ]
  },
  pro: {
    name: 'Pro',
    price: 1999,
    features: [
      'Everything in Free',
      'Unlimited patient records',
      'Advanced appointment scheduling',
      'Inventory management',
      'Basic reporting',
      'Priority email support',
      'M-Pesa integration'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: 9999,
    features: [
      'Everything in Pro',
      'Multiple locations',
      'Advanced reporting & analytics',
      'Custom integrations',
      'Dedicated support',
      'Training sessions',
      'API access'
    ]
  }
};

export default function BillingPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
      fetchInvoices();
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', user?.tenant_id)
      .single();

    if (tenantError) {
      console.error('Error fetching tenant data:', tenantError);
      return;
    }

    setSubscriptionData(tenantData);
  };

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('subscription_invoices')
      .select('*')
      .eq('tenant_id', user?.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      return;
    }

    setInvoices(data);
  };

  // Handle success/cancel from Paystack
  useEffect(() => {
    if (searchParams) {
      const reference = searchParams.get('reference');
      const trxref = searchParams.get('trxref');
      
      if (reference && trxref && reference === trxref) {
        toast.success('Payment successful! Your subscription has been updated.');
        fetchSubscriptionData();
        fetchInvoices();
        // Redirect to dashboard after showing toast
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    }
  }, [searchParams, router]);

  const handleUpgradeClick = (planKey: string) => {
    setSelectedPlan(planKey);
    setShowPaymentDialog(true);
  };

  const handlePayment = async (method: 'card' | 'mpesa') => {
    if (!selectedPlan || !user) {
      toast.error('No plan selected or user not logged in');
      return;
    }

    try {
      setLoading(true);
      setShowPaymentDialog(false);

      const plan = plans[selectedPlan as keyof typeof plans];
      const callback_url = `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`;

      const response = await initializeTransaction({
        amount: plan.price,
        email: user.email!,
        callback_url,
        metadata: {
          plan: selectedPlan,
          tenant_id: user.tenant_id,
          phone_number: phoneNumber || user.phone || '',
        },
      });

      if (response.status) {
        // Redirect to Paystack payment page
        window.location.href = response.data.authorization_url;
      } else {
        toast.error('Failed to initialize payment');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process payment');
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Billing & Subscription</h1>
      
      <Tabs defaultValue="subscription" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="subscription">
          <div className="grid gap-6 md:grid-cols-3">
            {Object.entries(plans).map(([key, plan]) => (
              <Card key={key} className={key === subscriptionData?.plan_type ? 'border-primary' : ''}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.price === 0 ? 'Free' : `KSh ${plan.price.toLocaleString()}/month`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Check className="h-4 w-4 mr-2 text-primary" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {key !== subscriptionData?.plan_type && (
                      <Button
                        onClick={() => handleUpgradeClick(key)}
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Wallet className="mr-2 h-4 w-4" />
                            {key === 'free' ? 'Downgrade' : 'Upgrade'}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Manage your payment methods and billing information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <CreditCard className="h-6 w-6" />
                    <div>
                      <h3 className="font-medium">Credit Card</h3>
                      <p className="text-sm text-muted-foreground">Pay with card</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => handlePayment('card')} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Pay'
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Wallet className="h-6 w-6" />
                    <div>
                      <h3 className="font-medium">M-PESA</h3>
                      <p className="text-sm text-muted-foreground">Pay with M-Pesa</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => handlePayment('mpesa')} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Pay'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                View your past payments and invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.length > 0 ? (
                  <div className="space-y-4">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">Invoice #{invoice.invoice_number}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(invoice.invoice_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">KSh {invoice.amount.toLocaleString()}</p>
                          <p className={`text-sm ${
                            invoice.status === 'paid' ? 'text-green-600' : 
                            invoice.status === 'failed' ? 'text-red-600' : 
                            'text-yellow-600'
                          }`}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No payment history available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              Select your preferred payment method to upgrade to {selectedPlan && plans[selectedPlan as keyof typeof plans].name} plan
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter M-Pesa phone number"
                className="w-full p-2 border rounded-md"
              />
              <Button
                onClick={() => handlePayment('card')}
                className="w-full"
                disabled={loading}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Pay with Card
              </Button>
              <Button
                onClick={() => handlePayment('mpesa')}
                className="w-full"
                disabled={loading || !phoneNumber}
              >
                <Wallet className="mr-2 h-4 w-4" />
                Pay with M-Pesa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 