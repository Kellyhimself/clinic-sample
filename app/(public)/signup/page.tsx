// app/signup/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import SignupForm from '@/components/SignupForm';

export default function SignUpPage() {
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
