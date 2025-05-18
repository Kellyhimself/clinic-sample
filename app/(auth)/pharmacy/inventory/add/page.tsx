import { createClient } from '@/app/lib/supabase/server';
import { fetchUserRole } from '@/lib/authActions';
import { redirect } from 'next/navigation';
import InventoryForm from '@/components/pharmacy/InventoryForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function AddInventoryPage() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      if (authError.message.includes('timeout') || authError.message.includes('fetch failed')) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4">
            <div className="max-w-2xl mx-auto">
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>
                  Unable to connect to the server. This might be due to:
                  <ul className="list-disc list-inside mt-2">
                    <li>Poor internet connection</li>
                    <li>Server maintenance</li>
                    <li>Temporary service disruption</li>
                  </ul>
                </AlertDescription>
              </Alert>
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        );
      }
      throw new Error('Authentication failed');
    }

    if (!user) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4">
          <div className="max-w-2xl mx-auto">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Session Expired</AlertTitle>
              <AlertDescription>
                Your session has expired. Please sign in again to continue.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.href = '/auth/signin'} 
              className="w-full"
            >
              Sign In
            </Button>
          </div>
        </div>
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error('Failed to fetch user profile');
    }

    if (!['admin', 'pharmacist'].includes(profile.role)) {
      redirect('/dashboard');
    }

    return <InventoryForm />;
  } catch (error) {
    console.error('Error in AddInventoryPage:', error);
    
    // Handle module resolution errors
    if (error instanceof Error && error.message.includes("Can't resolve")) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4">
          <div className="max-w-2xl mx-auto">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Application Error</AlertTitle>
              <AlertDescription>
                <p className="mb-2">There was a problem loading the application. This is likely a temporary issue.</p>
                <p className="text-sm text-gray-600">Error: {error.message}</p>
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/dashboard'} 
                className="w-full"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Handle other errors
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              We encountered an unexpected error. Please try again later or contact support if the problem persists.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/dashboard'} 
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }
} 