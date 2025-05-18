// app/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarDays, Pill, Phone, ShieldCheck, LogIn, MessageCircle, Calendar, Package, BarChart, Check, Facebook, Twitter, Instagram, ShoppingCart, Stethoscope, Mail } from 'lucide-react';
import { createClient } from '@/app/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (profile?.tenant_id) {
      redirect('/dashboard');
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-gradient-to-r from-blue-900 to-teal-900">
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            Transform Your Healthcare Practice
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto animate-fade-in-delay">
            Veylor360's all-in-one solution for pharmacy inventory, sales management, and clinic services. 
            Start your free trial today - no credit card required.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4 animate-fade-in-delay-2">
            <Link href="mailto:kituikelly@gmail.com">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                <Mail className="mr-2" /> Contact for Free Onboarding
              </Button>
            </Link>
            <Link href="https://wa.me/254748306871">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <MessageCircle className="mr-2" /> ..Prefer WhatsApp ?
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <LogIn className="mr-2" /> Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Everything You Need to Run Your Practice
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Pharmacy Management */}
            <div className="group p-6 rounded-xl bg-gradient-to-br from-blue-50 to-teal-50 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Package className="text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Inventory Management</h3>
              <p className="text-gray-600">Track stock levels, manage batches, and get automated alerts for low inventory or expiring medications.</p>
            </div>

            {/* Sales Management */}
            <div className="group p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShoppingCart className="text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sales & Analytics</h3>
              <p className="text-gray-600">Track sales, monitor profit margins, and make data-driven decisions with comprehensive analytics.</p>
            </div>

            {/* Clinic Services */}
            <div className="group p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Stethoscope className="text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Clinic Management</h3>
              <p className="text-gray-600">Manage appointments, patient records, and clinical services all in one place.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                See It In Action
              </h2>
              <p className="text-gray-600 mb-8">
                Watch how our platform streamlines your practice operations, from inventory management to patient care.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Check className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Real-time Inventory Tracking</h4>
                    <p className="text-gray-600">Monitor stock levels and get instant alerts</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Check className="text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Integrated Sales System</h4>
                    <p className="text-gray-600">Seamless billing and payment processing</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Check className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Comprehensive Analytics</h4>
                    <p className="text-gray-600">Make data-driven decisions with detailed reports</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative w-full max-w-5xl mx-auto lg:max-h-[600px]">
              <div className="absolute -top-12 left-0 right-0 text-center z-10">
                <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm py-3 px-6 rounded-full shadow-lg border border-gray-100">
                  <span className="text-blue-600 font-bold">💡 Watch in HD</span>
                  <span className="text-gray-600">|</span>
                  <span className="text-gray-700 font-medium">Click the video to view in full screen</span>
                </div>
              </div>
              <div className="relative w-full group" style={{ paddingBottom: '40.5%' }}> {/* 1366:554 aspect ratio (approximately 2.47:1) */}
                <a 
                  href="/videos/tutorial.mp4" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="absolute inset-0 w-full h-full cursor-pointer"
                >
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-300 rounded-xl"></div>
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover rounded-xl shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]"
                  >
                    <source src="/videos/tutorial.mp4" type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-lg">
                      <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Trusted by Healthcare Professionals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="p-6 rounded-xl bg-gray-50">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">JD</span>
                </div>
                <div>
                  <h4 className="font-semibold">Dr. Jane Doe</h4>
                  <p className="text-gray-600">Pharmacy Owner</p>
                </div>
              </div>
              <p className="text-gray-600">
                "The inventory management system has transformed our pharmacy. We've eliminated stock-outs and improved our profit margins significantly."
              </p>
            </div>

            {/* Testimonial 2 */}
            <div className="p-6 rounded-xl bg-gray-50">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">JS</span>
                </div>
                <div>
                  <h4 className="font-semibold">John Smith</h4>
                  <p className="text-gray-600">Clinic Manager</p>
                </div>
              </div>
              <p className="text-gray-600">
                "The integrated system for managing both our pharmacy and clinic services has streamlined our operations and improved patient care."
              </p>
            </div>

            {/* Testimonial 3 */}
            <div className="p-6 rounded-xl bg-gray-50">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-600 font-semibold">MS</span>
                </div>
                <div>
                  <h4 className="font-semibold">Mary Johnson</h4>
                  <p className="text-gray-600">Healthcare Administrator</p>
                </div>
              </div>
              <p className="text-gray-600">
                "The analytics dashboard gives us insights we never had before. We can now make data-driven decisions to improve our services."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join healthcare professionals already using Veylor360. Contact us for a personalized free trial setup - no credit card required.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <Link href="mailto:kituikelly@gmail.com">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                <Mail className="mr-2" /> Email for Free Onboarding
              </Button>
            </Link>
            <Link href="https://wa.me/254748306871">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <MessageCircle className="mr-2" /> ..Prefer WhatsApp ?
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Veylor360</h3>
              <p className="text-gray-400">
                Your all-in-one solution for healthcare practice management.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/features" className="text-gray-400 hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="text-gray-400 hover:text-white">Pricing</Link></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span className="text-gray-400">+254 748 306 871</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span className="text-gray-400">support@veylor360.com</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
              <div className="flex gap-4">
                <Link href="#" className="text-gray-400 hover:text-white">
                  <Facebook className="w-5 h-5" />
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white">
                  <Twitter className="w-5 h-5" />
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white">
                  <Instagram className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2024 Veylor360. All rights reserved.</p>
            <p className="mt-2">
              Developed by Kelly |{' '}
              <a href="mailto:kituikelly@gmail.com" className="underline hover:text-white">
                kituikelly@gmail.com
              </a>{' '}
              |{' '}
              <a href="https://wa.me/254748306871" className="underline hover:text-white">
                +254 748 306 871
              </a>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}