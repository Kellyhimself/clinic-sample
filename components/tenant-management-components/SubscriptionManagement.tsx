import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { formatAmountForDisplay } from "@/lib/stripe";
import { processSubscriptionPayment } from "@/lib/mpesa";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  stripe_price_id?: string;
  duration_days: number;
}

interface PaymentHistoryItem {
  id: string;
  tenant_id: string;
  plan_id: string;
  amount: number;
  payment_method: string;
  status: string;
  reference: string;
  payment_date: string;
  plan?: {
    name: string;
  };
}

interface TenantData {
  id: string;
  name: string;
  subscription_status: string;
  subscription_plan: string | null;
  last_payment_date: string | null;
  next_billing_date: string | null;
  payment_method: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  contact_phone: string | null;
}

interface SubscriptionManagementProps {
  tenantId: string;
}

export default function SubscriptionManagement({ tenantId }: SubscriptionManagementProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [processingPayment, setProcessingPayment] = useState(false);
  
  const supabase = createClientComponentClient();
  
  // Fetch subscription data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      try {
        // Fetch the tenant data
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single();
          
        if (tenantError) throw tenantError;
        
        setTenant(tenantData);
        
        // If the tenant has a phone number, use it
        if (tenantData.contact_phone) {
          setPhoneNumber(tenantData.contact_phone);
        }
        
        // Fetch all available plans
        const { data: plansData, error: plansError } = await supabase
          .from('subscription_plans')
          .select('*')
          .order('price', { ascending: true });
          
        if (plansError) throw plansError;
        
        setPlans(plansData);
        
        // Find current plan
        if (tenantData.subscription_plan) {
          const current = plansData.find(plan => plan.id === tenantData.subscription_plan);
          if (current) setCurrentPlan(current);
        }
        
        // Fetch payment history
        const { data: historyData, error: historyError } = await supabase
          .from('payment_history')
          .select('*, plan:subscription_plans(name)')
          .eq('tenant_id', tenantId)
          .order('payment_date', { ascending: false });
          
        if (historyError) throw historyError;
        
        setPaymentHistory(historyData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [tenantId, supabase]);
  
  // Handle subscription checkout with Stripe
  const handleStripeCheckout = async (planId: string) => {
    try {
      setProcessingPayment(true);
      
      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          tenantId,
        }),
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to create checkout session');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingPayment(false);
    }
  };
  
  // Handle portal session for managing existing subscriptions
  const handleManageSubscription = async () => {
    try {
      setProcessingPayment(true);
      
      const response = await fetch('/api/subscriptions/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
        }),
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to create portal session');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingPayment(false);
    }
  };
  
  // Handle M-Pesa payment
  const handleMpesaPayment = async (planId: string) => {
    try {
      if (!phoneNumber) {
        setError('Please enter a phone number for M-Pesa payment');
        return;
      }
      
      setProcessingPayment(true);
      
      // Find the plan to get the price
      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        setError('Plan not found');
        return;
      }
      
      const response = await fetch('/api/subscriptions/mpesa-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          tenantId,
          phoneNumber,
          amount: plan.price,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('M-Pesa payment request sent. Please check your phone to complete the payment.');
      } else {
        setError(data.error || 'Failed to initiate M-Pesa payment');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingPayment(false);
    }
  };
  
  // Format dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading subscription data...</div>;
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Subscription Management</h2>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 border-green-500 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="current">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Current Plan</TabsTrigger>
          <TabsTrigger value="plans">Available Plans</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>Your current plan and subscription details</CardDescription>
            </CardHeader>
            <CardContent>
              {currentPlan ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold">{currentPlan.name}</h3>
                    <Badge variant={tenant?.subscription_status === 'active' ? 'default' : 'destructive'}>
                      {tenant?.subscription_status || 'Unknown'}
                    </Badge>
                  </div>
                  
                  <p>{currentPlan.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Price</p>
                      <p className="text-lg font-semibold">{formatAmountForDisplay(currentPlan.price, currentPlan.currency || 'USD')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Billing Period</p>
                      <p className="text-lg font-semibold">{currentPlan.duration_days} days</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Last Payment</p>
                      <p className="text-lg font-semibold">{formatDate(tenant?.last_payment_date)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Next Billing Date</p>
                      <p className="text-lg font-semibold">{formatDate(tenant?.next_billing_date)}</p>
                    </div>
                  </div>
                  
                  <div className="rounded-md bg-secondary p-4">
                    <h4 className="font-medium mb-2">Features</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {currentPlan.features.map((feature, i) => (
                        <li key={i}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No active subscription</p>
                  <p className="mt-2">Select a plan below to subscribe</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              {tenant?.stripe_subscription_id && (
                <Button onClick={handleManageSubscription} disabled={processingPayment}>
                  Manage Subscription
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="plans">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={plan.id === currentPlan?.id ? 'border-primary' : ''}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold">{formatAmountForDisplay(plan.price, plan.currency || 'USD')}</span>
                    <span className="text-muted-foreground"> / {plan.duration_days} days</span>
                  </div>
                  
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex flex-col space-y-3">
                  {plan.id === currentPlan?.id ? (
                    <Badge className="self-center">Current Plan</Badge>
                  ) : (
                    <>
                      {plan.stripe_price_id && (
                        <Button 
                          onClick={() => handleStripeCheckout(plan.id)} 
                          disabled={processingPayment}
                          className="w-full"
                        >
                          Subscribe with Card
                        </Button>
                      )}
                      
                      <div className="flex items-center space-x-3 w-full">
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="Phone Number"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        />
                        <Button 
                          onClick={() => handleMpesaPayment(plan.id)} 
                          disabled={processingPayment}
                          variant="outline"
                        >
                          Pay with M-Pesa
                        </Button>
                      </div>
                    </>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Your subscription payment history</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell>{payment.plan?.name || payment.plan_id}</TableCell>
                        <TableCell>{formatAmountForDisplay(payment.amount, 'USD')}</TableCell>
                        <TableCell className="capitalize">{payment.payment_method}</TableCell>
                        <TableCell>{payment.reference}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={payment.status === 'completed' ? 'default' : 'destructive'}
                            className="capitalize"
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No payment history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 