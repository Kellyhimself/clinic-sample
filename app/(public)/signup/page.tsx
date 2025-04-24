// app/signup/page.tsx
import SignupForm from '@/components/SignupForm';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-6">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6">
        <SignupForm />
      </div>
    </div>
  );
}
