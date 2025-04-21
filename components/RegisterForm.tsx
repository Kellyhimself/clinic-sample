// components/forms/RegisterForm.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signup } from '@/lib/authActions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRegister(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      await signup(formData);
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleRegister} className="space-y-4 max-w-md mx-auto p-4 md:p-6 bg-white rounded-lg shadow-lg">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Full Name</Label>
        <Input
          name="fullName"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Email</Label>
        <Input
          name="email"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Phone Number</Label>
        <Input
          name="phoneNumber"
          placeholder="Phone Number (e.g., +254712345678)"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          pattern="\+254[0-9]{9}"
          required
          className="w-full bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Password</Label>
        <Input
          name="password"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button 
        type="submit" 
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
      >
        {loading ? 'Registering...' : 'Sign Up'}
      </Button>
    </form>
  );
}