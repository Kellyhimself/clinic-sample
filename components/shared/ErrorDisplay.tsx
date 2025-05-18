'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorDisplayProps {
  type: 'connection' | 'auth' | 'error';
  error?: Error;
  onRetry?: () => void;
  onSignIn?: () => void;
}

export default function ErrorDisplay({ type, error, onRetry, onSignIn }: ErrorDisplayProps) {
  if (type === 'auth') {
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
            onClick={onSignIn} 
            className="w-full"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (type === 'connection') {
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
            onClick={onRetry} 
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <p className="mb-2">We encountered an unexpected error. This might be due to:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Application updates</li>
              <li>Server maintenance</li>
              <li>Temporary service disruption</li>
            </ul>
            {process.env.NODE_ENV === 'development' && error && (
              <p className="mt-2 text-sm text-gray-600">
                Error: {error.message}
              </p>
            )}
          </AlertDescription>
        </Alert>
        <div className="space-y-2">
          <Button 
            onClick={onRetry} 
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