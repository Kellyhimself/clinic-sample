"use client";

import { useEffect, useState } from "react";
import { getAppointmentData, fetchPatients, fetchUserRole } from "@/lib/authActions";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AppointmentBookingSection from "@/components/AppointmentBookingSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookAppointmentForm from "@/components/BookAppointmentForm";
import type { Patient } from "@/types/supabase";

// Define proper types for services and doctors
interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Doctor {
  id: string;
  full_name: string;
  license_number?: string;
  specialty?: string;
}

export default function BookAppointmentPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get appointment data (services and doctors)
        const data = await getAppointmentData();
        setServices(data.services);
        setDoctors(data.doctors);
        
        // Check user role
        const role = await fetchUserRole();
        setUserRole(role);
        
        // If user is staff/admin/doctor, fetch patients for the staff booking interface
        if (["admin", "staff", "doctor"].includes(role)) {
          const patientsData = await fetchPatients();
          setPatients(patientsData);
        }
      } catch (err) {
        console.error("Error fetching appointment data:", err);
        setError("Failed to load appointment data. Please try again later.");
        toast.error("Error", {
          description: "Failed to load appointment data. Please try again later.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-destructive text-center mb-4">{error}</p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push("/")}
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isStaff = ["admin", "staff", "doctor"].includes(userRole || "");

  return (
    <div className="w-full">
      {isStaff ? (
        <Tabs defaultValue="staff-booking" className="w-full">
          <div className="px-4 py-2 border-b bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.back()}
                  className="h-6 w-6"
                >
                  <ArrowLeft className="h-3 w-3" />
                </Button>
                <h2 className="text-sm font-semibold">Book an Appointment</h2>
              </div>
              <TabsList className="h-8">
                <TabsTrigger value="staff-booking" className="text-xs px-3 py-1.5">
                  Staff Booking
                </TabsTrigger>
                <TabsTrigger value="self-booking" className="text-xs px-3 py-1.5">
                  Self Booking
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          <TabsContent value="staff-booking" className="mt-0">
            <AppointmentBookingSection 
              services={services} 
              doctors={doctors} 
              patients={patients} 
            />
          </TabsContent>
          
          <TabsContent value="self-booking" className="mt-0 p-0">
            <div className="w-full">
              <BookAppointmentForm services={services} doctors={doctors} />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div>
          <div className="px-4 py-2 border-b bg-white">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-6 w-6"
              >
                <ArrowLeft className="h-3 w-3" />
              </Button>
              <h2 className="text-sm font-semibold">Book an Appointment</h2>
            </div>
          </div>
          <BookAppointmentForm services={services} doctors={doctors} />
        </div>
      )}
    </div>
  );
}