// app/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarDays, Pill, Phone, ShieldCheck, LogIn } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-server';

export default async function HomePage() {
  const supabase = await getSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="bg-gray-50 min-h-screen">
      <section className="bg-gradient-to-r from-blue-500 to-teal-500 text-white py-8 md:py-12">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 md:mb-4">
            Welcome to Vision & Smile Clinic
          </h1>
          <p className="text-base md:text-lg mb-4 md:mb-6">
            Your one-stop solution for dental and optical care in Kenya.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <Link href="/bookAppointment">
            <Button size="lg" variant="secondary">
              Book an Appointment
            </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="text-gray-300 border-white hover:bg-white hover:text-teal-500"
              >
                <LogIn className="mr-2" /> Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 container mx-auto">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-8">
          Our Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="flex flex-col items-center p-6">
              <Image
                src="/images/dental-care.webp"
                alt="Dental Care"
                width={500}
                height={160}
                className="w-full h-40 object-cover rounded-md mb-4"
              />
              <h3 className="text-lg md:text-xl font-semibold">Dental Care</h3>
              <p className="text-gray-600 text-center">
                Comprehensive dental checkups, cleanings, and treatments.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-6">
              <Image
                src="/images/lady.webp"
                alt="Optical Care"
                width={500}
                height={160}
                className="w-full h-40 object-cover rounded-md mb-4"
              />
              <h3 className="text-lg md:text-xl font-semibold">Optical Care</h3>
              <p className="text-gray-600 text-center">
                Eye exams, glasses, and contact lens services.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-6">
              <Image
                src="/images/mzae.webp"
                alt="General Health"
                width={500}
                height={160}
                className="w-full h-40 object-cover rounded-md mb-4"
              />
              <h3 className="text-lg md:text-xl font-semibold">General Health</h3>
              <p className="text-gray-600 text-center">
                Routine checkups and health consultations.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-12 bg-gray-100">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold text-center mb-8">
            Book an Appointment
          </h2>
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-6">
              <form className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+254 700 123 456" />
                </div>
                <div>
                  <Label htmlFor="service">Service Requested</Label>
                  <Input id="service" placeholder="e.g., Dental Checkup" />
                </div>
                <Button type="submit" className="w-full">
                  <CalendarDays className="mr-2" /> Submit Booking
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-12 container mx-auto">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-8">
          Request Prescription Refill
        </h2>
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-6">
            <form className="space-y-4">
              <div>
                <Label htmlFor="refillName">Full Name</Label>
                <Input id="refillName" placeholder="John Doe" />
              </div>
              <div>
                <Label htmlFor="refillPhone">Phone Number</Label>
                <Input id="refillPhone" placeholder="+254 700 123 456" />
              </div>
              <div>
                <Label htmlFor="refillDetails">Prescription Details</Label>
                <Textarea
                  id="refillDetails"
                  placeholder="e.g., Medication name, dosage"
                />
              </div>
              <Button type="submit" className="w-full">
                <Pill className="mr-2" /> Submit Refill Request
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="py-12 bg-gray-100">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold text-center mb-8">
            Supported Health Insurance Providers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="flex items-center justify-center p-4">
                <ShieldCheck className="mr-2 text-blue-500" />
                <p className="font-semibold">NHIF</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-center p-4">
                <ShieldCheck className="mr-2 text-blue-500" />
                <p className="font-semibold">AAR Insurance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-center p-4">
                <ShieldCheck className="mr-2 text-blue-500" />
                <p className="font-semibold">Jubilee Insurance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-center p-4">
                <ShieldCheck className="mr-2 text-blue-500" />
                <p className="font-semibold">Britam</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto text-center">
          <p>
            Contact us: <Phone className="inline mr-2" /> +254 700 123 456
          </p>
          <p>© 2025 Vision & Smile Clinic. All rights reserved.</p>
          <p className="mt-2 text-sm">
            Developed by Kelly |{' '}
            <a href="mailto:kituikelly@gmail.com" className="underline hover:text-teal-300">
              kituikelly@gmail.com
            </a>{' '}
            |{' '}
            <a href="https://wa.me/254748306871" className="underline hover:text-teal-300">
              +254 748 306 871
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}