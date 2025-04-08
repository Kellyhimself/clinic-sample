// app/signup/page.tsx
import RegisterForm from '@/components/RegisterForm';

export default function SignUpPage() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50">
      <RegisterForm />
    </main>
  );
}
