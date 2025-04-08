// components/LoginForm.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { login } from '@/lib/authActions';
import Link from 'next/link';

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);

    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      await login(formData);
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Don’t have an account? Sign up below.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form action={onSubmit} className="space-y-6 p-6 bg-white rounded-lg shadow-md w-full max-w-sm">
      <h2 className="text-2xl font-semibold text-center">Login</h2>

      <div className="space-y-4">
        <Input type="email" name="email" placeholder="Email" required />
        <Input type="password" name="password" placeholder="Password" required />
      </div>

      {error && (
        <div className="text-red-500 text-sm">
          {error}
          {error.includes('Sign up') && (
            <Link href="/signup" className="text-blue-500 hover:underline ml-1">
              Sign up here
            </Link>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </Button>

      <p className="text-center text-sm text-gray-600">
        Don’t have an account?{' '}
        <Link href="/signup" className="text-blue-500 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}