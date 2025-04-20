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
import { toast } from "sonner";

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

  async function onSubmit(formData: FormData) {
    setIsSubmitting(true);
    setRegistrationError(false);

    try {
      await handleBooking(formData);
      toast.success("Appointment Confirmed!", {
        description: "Your appointment has been successfully scheduled. Please arrive 10 minutes before your scheduled time.",
        duration: 5000,
      });
      router.push("/appointments");
    } catch (error) {
      console.error("Booking error:", error);
      if (error instanceof Error) {
        if (error.message.includes("register as a patient")) {
          setRegistrationError(true);
          toast.error("Registration Required", {
            description: "You need to be registered as a patient to book an appointment. Please log in as an administrator to complete your registration.",
            action: {
              label: "Go to Login",
              onClick: () => router.push("/login"),
            },
            duration: 10000,
          });
        } else {
          toast.error("Error", {
            description: error.message,
          });
        }
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
      <div>
        <Label htmlFor="serviceId">Service</Label>
        <Select 
          name="serviceId" 
          value={formData.serviceId}
          onValueChange={(value) => handleChange('serviceId', value)}
        >
          <SelectTrigger id="serviceId">
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
        <Label htmlFor="customService">Or describe a custom service</Label>
        <Textarea
          id="customService"
          name="customService"
          value={formData.customService}
          onChange={(e) => handleChange('customService', e.target.value)}
          placeholder="Describe your service if not listed above..."
          className="min-h-[100px]"
        />
      </div>

      <div>
        <Label htmlFor="doctorId">Doctor</Label>
        <Select
          name="doctorId"
          value={formData.doctorId}
          onValueChange={(value) => handleChange('doctorId', value)}
        >
          <SelectTrigger id="doctorId">
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

      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={(e) => handleChange('date', e.target.value)}
          required
          min={new Date().toISOString().split("T")[0]}
        />
      </div>

      <div>
        <Label htmlFor="time">Time</Label>
        <Input 
          type="time" 
          id="time" 
          name="time" 
          value={formData.time}
          onChange={(e) => handleChange('time', e.target.value)}
          required 
        />
      </div>

      <div>
        <Label htmlFor="notes">Additional Notes (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Any additional details..."
          className="min-h-[100px]"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        Book Appointment
      </Button>

      {registrationError && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive mb-2">
            You need to be registered as a patient to book an appointment.
          </p>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => router.push("/login")}
          >
            Log in as Administrator to Register
          </Button>
        </div>
      )}
    </form>
  );
} 