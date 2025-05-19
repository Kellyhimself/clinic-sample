'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/app/lib/auth/client';
import { useSubscription } from '@/app/lib/hooks/useSubscription';
import { toast } from 'sonner';
import { Loader2, Check, CreditCard, Wallet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getInvoices } from '@/app/actions/subscription';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AxiosError } from 'axios';

// Determine if we're in development or production
const isDevelopment = process.env.NODE_ENV === 'development';

// Add PaystackPop type to window
declare global {
  interface Window {
    PaystackPop: {
      setup: (config: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        callback: (response: { reference: string; status: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
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

interface Plan {
  name: string;
  price: number;
  features: string[];
}

const plans: Record<string, Plan> = {
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
    price: 999,
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
    price: 2999,
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
  const { tenantId, user } = useAuth();
  const { subscription, loading: subscriptionLoading, error: subscriptionError, retryCount: subscriptionRetryCount, refetch: refetchSubscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchInvoices();
    }
  }, [tenantId]);

  // Handle payment callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    const trxref = urlParams.get('trxref');

    if (reference && trxref && reference === trxref) {
      // Clear the URL parameters to prevent repeated processing
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Show success message
      toast.success('Payment processed successfully!');
      
      // Refresh subscription data
      if (tenantId) {
        refetchSubscription();
        fetchInvoices();
      }
    }
  }, [tenantId, refetchSubscription]);

  const fetchInvoices = async () => {
    if (!tenantId) return;

    try {
      setIsLoadingInvoices(true);
      setError(null);
      const { data, error } = await getInvoices(tenantId);

      if (error) {
        console.error('Error from getInvoices:', error);
        throw error;
      }

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
        setInvoices(formattedInvoices);
      }
    } catch (error) {
      console.error('Error in fetchInvoices:', error);
      setError('Failed to fetch payment history');
      toast.error('Failed to fetch payment history');
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const handleUpgradeClick = (planKey: string) => {
    if (!user) {
      toast.error('Please log in to upgrade your plan');
      return;
    }
    setSelectedPlan(planKey);
    setShowPaymentDialog(true);
  };

  const handlePayment = async (method: 'card' | 'mpesa') => {
    if (!selectedPlan || !user || !tenantId || !user.email) {
      console.log('Missing required data:', {
        hasSelectedPlan: !!selectedPlan,
        hasUser: !!user,
        hasTenantId: !!tenantId,
        hasUserEmail: !!user?.email
      });
      return;
    }

    if (method === 'mpesa' && !phoneNumber) {
      toast.error('Please enter your phone number for M-Pesa payment');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setShowPaymentDialog(false);
      setIsRedirecting(true);

      const plan = plans[selectedPlan];
      const callback_url = `${window.location.origin}/settings/billing`;

      const transactionData = {
        amount: plan.price,
        email: user.email,
        callback_url,
        metadata: {
          tenant_id: tenantId,
          plan: plan.name,
          plan_id: selectedPlan,
          payment_method: method,
          phone_number: method === 'mpesa' ? phoneNumber : null,
          environment: isDevelopment ? 'test' : 'production'
        }
      };

      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize payment');
      }

      const data = await response.json();

      if (data.status && data.data) {
        // Clear any existing URL parameters before redirecting
        window.history.replaceState({}, '', window.location.pathname);
        // Redirect to Paystack payment page
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error('Failed to initialize payment');
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      if (error instanceof AxiosError) {
        console.error('Error response:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      setError('Failed to initialize payment. Please try again.');
      toast.error('Failed to initialize payment. Please try again.');
      setIsRedirecting(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading || subscriptionLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              {isRedirecting ? 'Just a moment while you are being redirected to the payment portal...' : 'Loading...'}
            </h2>
            {subscriptionLoading && subscriptionRetryCount > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                Attempting to load subscription data... (Attempt {subscriptionRetryCount}/3)
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show error state if subscription fetch failed after retries
  if (subscriptionError && subscriptionRetryCount >= 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg text-center">
            <h2 className="text-lg sm:text-xl font-semibold text-red-600 mb-4">
              Error loading subscription data
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              {subscriptionError.message}
            </p>
            <Button 
              onClick={() => refetchSubscription()}
              className="w-full sm:w-auto"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 sm:px-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Billing & Subscription</h1>
      
          {/* Current Plan Status */}
      {subscription && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>
                  Your current subscription plan and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">
                  {plans[subscription.plan]?.name || 'Free'} Plan
                    </h3>
                    <p className="text-muted-foreground">
                  Status: <Badge variant={subscription.status === 'active' ? "default" : "destructive"}>
                    {subscription.status}
                      </Badge>
                    </p>
                  </div>
              {subscription.plan !== 'enterprise' && (
                    <Button onClick={() => handleUpgradeClick('enterprise')}>
                      Upgrade Plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="plans" className="mb-8">
        <TabsList className="mx-auto flex w-full max-w-md justify-center">
              <TabsTrigger value="plans">Available Plans</TabsTrigger>
              <TabsTrigger value="history">Payment History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="plans">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(plans).map(([key, plan]) => (
                  <Card key={key} className="flex flex-col">
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>
                        {plan.price === 0 ? 'Free' : `$${plan.price}/month`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <Check className="h-4 w-4 mr-2 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <div className="p-6 pt-0">
                      <Button
                        className="w-full"
                        onClick={() => handleUpgradeClick(key)}
                    disabled={key === subscription?.plan}
                      >
                    {key === subscription?.plan ? 'Current Plan' : 'Upgrade'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="history">
              {isLoadingInvoices ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading payment history...</span>
                </div>
              ) : invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.invoice_number}</TableCell>
                        <TableCell>
                          {invoice.invoice_date
                            ? new Date(invoice.invoice_date).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {invoice.currency} {invoice.amount}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              invoice.status === 'paid'
                            ? 'default'
                                : invoice.status === 'pending'
                            ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No payment history available
                </div>
              )}
            </TabsContent>
          </Tabs>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              Select your preferred payment method to upgrade to {selectedPlan && plans[selectedPlan]?.name} plan
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