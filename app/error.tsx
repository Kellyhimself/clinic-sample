'use client';

import { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4">
          <div className="max-w-2xl mx-auto">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Application Error</AlertTitle>
              <AlertDescription>
                <p className="mb-2">Something went wrong in the application. This might be due to:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Network connectivity issues</li>
                  <li>Server maintenance</li>
                  <li>Application updates</li>
                </ul>
                {process.env.NODE_ENV === 'development' && (
                  <p className="mt-2 text-sm text-gray-600">
                    Error: {error.message}
                  </p>
                )}
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button 
                onClick={() => reset()} 
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
      </body>
    </html>
  );
} 