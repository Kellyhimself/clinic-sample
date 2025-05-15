import LoginForm from '@/components/LoginForm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirectedFrom?: string; message?: string };
}) {
  const message = searchParams?.message;
  const redirectedFrom = searchParams?.redirectedFrom;

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-teal-500 p-6 text-white">
            <h1 className="text-2xl font-bold">Welcome Back</h1>
            <p className="text-blue-100 mt-1">Sign in to your account</p>
          </div>
          
          <div className="p-6">
            {message && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
                {message}
              </div>
            )}
            <LoginForm redirectTo={redirectedFrom} />
          </div>
        </div>
      </div>
    </div>
  );
} 