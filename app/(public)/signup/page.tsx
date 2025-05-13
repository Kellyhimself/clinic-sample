// app/signup/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import SignupForm from '@/components/SignupForm';
import { Suspense } from 'react';

function SignupContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const role = searchParams.get('role');
  const email = searchParams.get('email');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-6">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6">
        <SignupForm token={token || ''} role={role || ''} email={email || ''} />
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-6">
        <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
