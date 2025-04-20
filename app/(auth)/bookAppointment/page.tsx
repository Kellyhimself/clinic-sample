// app/(auth)/book-appointment/page.tsx
import { getAuthData, getAppointmentData } from '@/lib/authActions';
import { BookAppointmentForm } from '@/components/BookAppointmentForm';

export default async function BookAppointmentPage() {
  await getAuthData(); // Just check auth, don't need the role
  const { services, doctors } = await getAppointmentData();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Book Appointment</h1>
      <BookAppointmentForm services={services} doctors={doctors} />
    </div>
  );
}