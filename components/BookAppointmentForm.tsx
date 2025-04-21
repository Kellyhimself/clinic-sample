"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { handleBooking } from "@/lib/authActions";
import { useRouter } from "next/navigation";

interface BookAppointmentFormProps {
  services: Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
  }>;
  doctors: Array<{
    id: string;
    full_name: string;
  }>;
}

export function BookAppointmentForm({ services, doctors }: BookAppointmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  async function onSubmit(formData: FormData) {
    setIsSubmitting(true);
    setRegistrationError(false);
    setBookingStatus(null);

    try {
      const result = await handleBooking(formData);
      if (result.success) {
        setBookingStatus({
          success: true,
          message: result.message
        });
        setTimeout(() => {
          router.push("/appointments");
        }, 2000);
      } else {
        setBookingStatus({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error("Booking error:", error);
      if (error instanceof Error) {
        if (error.message.includes("register as a patient")) {
          setRegistrationError(true);
          setBookingStatus({
            success: false,
            message: "You need to be registered as a patient to book an appointment. Please log in as an administrator to complete your registration."
          });
        } else {
          setBookingStatus({
            success: false,
            message: error.message
          });
        }
      } else {
        setBookingStatus({
          success: false,
          message: "An unexpected error occurred. Please try again."
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const [formData, setFormData] = useState({
    serviceId: "",
    customService: "",
    doctorId: "",
    date: "",
    time: "",
    notes: ""
  });

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form action={onSubmit} className="space-y-4">
      {bookingStatus && (
        <div className={`p-4 rounded-lg ${
          bookingStatus.success 
            ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200" 
            : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
        }`}>
          <div className="flex items-center gap-2">
            {bookingStatus.success ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <p>{bookingStatus.message}</p>
          </div>
          {!bookingStatus.success && (
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => setBookingStatus(null)}
            >
              Try Again
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Card - Service and Doctor Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Service Details</h3>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="serviceId" className="text-sm">Service</Label>
              <Select 
                name="serviceId" 
                value={formData.serviceId}
                onValueChange={(value) => handleChange('serviceId', value)}
              >
                <SelectTrigger id="serviceId" className="w-full h-9">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} (${service.price}, {service.duration} mins)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="customService" className="text-sm">Custom Service Description</Label>
              <Textarea
                id="customService"
                name="customService"
                value={formData.customService}
                onChange={(e) => handleChange('customService', e.target.value)}
                placeholder="Describe your service if not listed above..."
                className="min-h-[60px]"
              />
            </div>

            <div>
              <Label htmlFor="doctorId" className="text-sm">Doctor</Label>
              <Select
                name="doctorId"
                value={formData.doctorId}
                onValueChange={(value) => handleChange('doctorId', value)}
              >
                <SelectTrigger id="doctorId" className="w-full h-9">
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Right Card - Date, Time and Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Appointment Details</h3>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="date" className="text-sm">Date</Label>
              <Input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                required
                min={new Date().toISOString().split("T")[0]}
                className="w-full h-9"
              />
            </div>

            <div>
              <Label htmlFor="time" className="text-sm">Time</Label>
              <Input 
                type="time" 
                id="time" 
                name="time" 
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                required 
                className="w-full h-9"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm">Additional Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Any additional details..."
                className="min-h-[60px]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full md:w-auto"
        >
          {isSubmitting ? "Booking..." : "Book Appointment"}
        </Button>
      </div>
    </form>
  );
} 