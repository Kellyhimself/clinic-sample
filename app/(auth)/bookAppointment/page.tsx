"use client";

import { useEffect, useState } from "react";
import { getAppointmentData } from "@/lib/authActions";
import { BookAppointmentForm } from "@/components/BookAppointmentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function BookAppointmentPage() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAppointmentData();
        setServices(data.services);
        setDoctors(data.doctors);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-2xl font-bold text-blue-600">
                Book an Appointment
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <BookAppointmentForm services={services} doctors={doctors} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}