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
import { getSubscriptionData, getInvoices } from '@/app/actions/subscription';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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

interface SubscriptionData {
  id: string;
  tenant_id: string;
  plan_type: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  billing_address: string | null;
  billing_email: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface InvoiceMetadata {
  plan?: string;
  tenant_id?: string;
  phone_number?: string;
  [key: string]: unknown;
}

interface Invoice {
  id: string;
  tenant_id: string;
  amount: number;
  currency: string | null;
  status: string;
  payment_method: string | null;
  payment_date: string | null;
  paystack_payment_id: string | null;
  external_invoice_id: string | null;
  invoice_number: string;
  invoice_date: string | null;
  due_date: string | null;
  period_start: string | null;
  period_end: string | null;
  metadata: InvoiceMetadata | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function BillingPage() {
  const { user, loading: authLoading, tenantId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !tenantId) {
      router.push('/login');
      return;
    }

      fetchSubscriptionData();
      fetchInvoices();
  }, [user, authLoading, router, tenantId]);

  const fetchSubscriptionData = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await getSubscriptionData(tenantId);

      if (error) {
        console.error('Error fetching tenant data:', error);
        toast.error('Failed to fetch subscription data');
      return;
    }

      if (data) {
        const subscriptionData: SubscriptionData = {
          id: data.id,
          tenant_id: tenantId,
          plan_type: data.plan_type || 'free',
          status: data.status || 'inactive',
          current_period_start: data.current_period_start || null,
          current_period_end: data.current_period_end || null,
          cancel_at_period_end: data.cancel_at_period_end || null,
          billing_address: data.billing_address || null,
          billing_email: data.billing_email || null,
          contact_person: data.contact_person || null,
          contact_phone: data.contact_phone || null,
          is_active: data.is_active || null,
          created_at: data.created_at || null,
          updated_at: data.updated_at || null
        };
        setSubscriptionData(subscriptionData);
      }
    } catch (error) {
      console.error('Error in fetchSubscriptionData:', error);
      toast.error('Failed to fetch subscription data');
    }
  };

  const fetchInvoices = async () => {
    if (!tenantId) return;

    try {
      setIsLoadingInvoices(true);
      console.log('Fetching invoices for tenant:', tenantId);
      const { data, error } = await getInvoices(tenantId);

    if (error) {
      console.error('Error fetching invoices:', error);
        toast.error('Failed to fetch payment history');
      return;
    }

      console.log('Raw invoice data:', data);

      if (data) {
        const formattedInvoices: Invoice[] = data.map(invoice => ({
          id: invoice.id,
          tenant_id: tenantId,
          amount: invoice.amount,
          currency: invoice.currency || null,
          status: invoice.status || 'pending',
          payment_method: invoice.payment_method || null,
          payment_date: invoice.payment_date || null,
          paystack_payment_id: invoice.paystack_payment_id || null,
          external_invoice_id: invoice.external_invoice_id || null,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date || null,
          due_date: invoice.due_date || null,
          period_start: invoice.period_start || null,
          period_end: invoice.period_end || null,
          metadata: invoice.metadata ? {
            plan: typeof invoice.metadata === 'object' && invoice.metadata !== null ? 
              (invoice.metadata as InvoiceMetadata).plan : undefined,
            tenant_id: typeof invoice.metadata === 'object' && invoice.metadata !== null ? 
              (invoice.metadata as InvoiceMetadata).tenant_id : undefined,
            phone_number: typeof invoice.metadata === 'object' && invoice.metadata !== null ? 
              (invoice.metadata as InvoiceMetadata).phone_number : undefined,
            ...(typeof invoice.metadata === 'object' && invoice.metadata !== null ? 
              invoice.metadata as Record<string, unknown> : {})
          } : null,
          created_at: invoice.created_at || null,
          updated_at: invoice.updated_at || null
        }));
        console.log('Formatted invoices:', formattedInvoices);
        setInvoices(formattedInvoices);
      } else {
        console.log('No invoice data received');
      }
    } catch (error) {
      console.error('Error in fetchInvoices:', error);
      toast.error('Failed to fetch payment history');
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  // Handle success/cancel from Paystack
  useEffect(() => {
    if (!user) return;

    if (searchParams) {
      const reference = searchParams.get('reference');
      const trxref = searchParams.get('trxref');
      
      if (reference && trxref && reference === trxref) {
        toast.success('Payment successful! Your subscription has been updated.');
        fetchSubscriptionData();
        fetchInvoices();
      }
    }
  }, [searchParams, router, user]);

  const handleUpgradeClick = (planKey: string) => {
    if (!user) {
      toast.error('Please log in to upgrade your plan');
      router.push('/login');
      return;
    }

    setSelectedPlan(planKey);
    setShowPaymentDialog(true);
  };

  const handlePayment = async (method: 'card' | 'mpesa') => {
    if (!user || !tenantId) {
      router.push('/login');
      return;
    }

    if (!selectedPlan) {
      toast.error('No plan selected');
      return;
    }

    try {
      setLoading(true);
      setShowPaymentDialog(false);
      setIsRedirecting(true);

      const plan = plans[selectedPlan as keyof typeof plans];
      const callback_url = `${window.location.origin}/settings/billing`;

      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        amount: plan.price,
        email: user.email!,
        callback_url,
          method,
        metadata: {
          plan: selectedPlan,
            tenant_id: tenantId,
          phone_number: phoneNumber || user.phone || '',
        },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      if (data.status) {
        window.location.href = data.data.authorization_url;
      } else {
        toast.error('Failed to initialize payment');
        setIsRedirecting(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process payment');
      setIsRedirecting(false);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50">
        <div className="w-full max-w-md space-y-8 p-8">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isRedirecting ? 'Just a moment as you are being redirected to the payment portal...' : 'Loading...'}
            </h2>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !tenantId) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50">
    <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-900">Billing & Subscription</h1>
      
      <Tabs defaultValue="subscription" className="space-y-4">
          <TabsList className="w-full max-w-md mx-auto">
            <TabsTrigger value="subscription" className="flex-1">Subscription</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Payment History</TabsTrigger>
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
                      <Button
                        onClick={() => handleUpgradeClick(key)}
                        disabled={loading || key === subscriptionData?.plan_type}
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
                            {key === subscriptionData?.plan_type ? 'Current Plan' : key === 'free' ? 'Downgrade' : 'Upgrade'}
                          </>
                        )}
                      </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
          <TabsContent value="history">
          <Card>
              <CardHeader className="p-2 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-4">
                  <CardTitle className="text-base sm:text-lg">Payment History</CardTitle>
                </div>
              </CardHeader>
              <div className="p-2 sm:p-4 md:p-6">
                <div className="w-full mx-auto bg-white rounded-lg overflow-hidden">
                  {isLoadingInvoices ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-gray-600">Loading payment history...</span>
                    </div>
                  ) : (
                    <Table className="w-full border-collapse">
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs font-medium text-gray-700 p-2">Invoice #</TableHead>
                          <TableHead className="text-xs font-medium text-gray-700 p-2">Date</TableHead>
                          <TableHead className="text-xs font-medium text-gray-700 p-2">Amount</TableHead>
                          <TableHead className="text-xs font-medium text-gray-700 p-2">Status</TableHead>
                          <TableHead className="text-xs font-medium text-gray-700 p-2">Payment Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.length > 0 ? (
                          invoices.map((invoice) => (
                            <TableRow key={invoice.id} className="hover:bg-gray-100 border-b">
                              <TableCell className="text-sm p-2">{invoice.invoice_number}</TableCell>
                              <TableCell className="text-sm p-2">
                                {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : 'N/A'}
                              </TableCell>
                              <TableCell className="text-sm p-2">KSh {invoice.amount.toLocaleString()}</TableCell>
                              <TableCell className="text-sm p-2">
                                <Badge
                                  variant={
                                    invoice.status === 'paid'
                                      ? 'default'
                                      : invoice.status === 'failed'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                >
                                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm p-2">
                                {invoice.payment_method ? (
                                  <Badge variant="outline" className="capitalize">
                                    {invoice.payment_method}
                                  </Badge>
                                ) : (
                                  'N/A'
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-sm text-gray-500 py-4">
                              No payment history available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
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
    </div>
  );
} 