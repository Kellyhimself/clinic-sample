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

export default function BookAppointmentForm({ services, doctors }: BookAppointmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState(false);
  const [step, setStep] = useState(1);
  const [bookingStatus, setBookingStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.doctorId || (!formData.serviceId && !formData.customService) || !formData.date || !formData.time) {
      setBookingStatus({
        success: false,
        message: 'Please fill in all required fields'
      });
      return;
    }
    
    setIsSubmitting(true);
    setRegistrationError(false);
    setBookingStatus(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append('doctorId', formData.doctorId);
      formDataObj.append('date', formData.date);
      formDataObj.append('time', formData.time);
      
      if (formData.serviceId) {
        formDataObj.append('serviceId', formData.serviceId);
      }
      
      if (formData.customService) {
        formDataObj.append('customService', formData.customService);
      }
      
      if (formData.notes) {
        formDataObj.append('notes', formData.notes);
      }
      
      const result = await handleBooking(formDataObj);
      if (result.success) {
        setBookingStatus({
          success: true,
          message: result.message || 'Appointment booked successfully!'
        });
        setTimeout(() => {
          router.push("/appointments");
        }, 2000);
      } else {
        setBookingStatus({
          success: false,
          message: result.message || 'Failed to book appointment'
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-2">
      <div className="w-full max-w-[1400px] mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {bookingStatus && (
          <div className={`m-4 p-2 rounded-md ${
            bookingStatus.success 
              ? "bg-green-50 text-green-800 border border-green-200" 
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            <div className="flex items-center gap-2 text-xs">
              {bookingStatus.success ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <p>{bookingStatus.message}</p>
            </div>
          </div>
        )}

        <div className="p-4">
          {/* Step Indicator */}
          <div className="flex justify-center mb-3">
            <div className="flex items-center space-x-1">
              {[1, 2].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      step === stepNumber
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : step > stepNumber
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {stepNumber}
                  </div>
                  {stepNumber < 2 && (
                    <div
                      className={`w-12 h-0.5 ${
                        step > stepNumber ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left Column - Form Steps */}
            <div className="lg:col-span-3 space-y-4">
              {/* Step Content */}
              <div className="space-y-2">
                {step === 1 && (
                  <div className="space-y-1">
                    <div className="flex flex-col gap-0.5">
                      <Label className="text-xs">Service</Label>
                      <Select 
                        name="serviceId" 
                        value={formData.serviceId}
                        onValueChange={(value) => handleChange('serviceId', value)}
                      >
                        <SelectTrigger id="serviceId" className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
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

                    {formData.serviceId === "" && (
                      <div className="flex flex-col gap-0.5 mt-1">
                        <Label className="text-xs">Custom Service Description</Label>
                        <Textarea
                          id="customService"
                          name="customService"
                          value={formData.customService}
                          onChange={(e) => handleChange('customService', e.target.value)}
                          placeholder="Describe your service if not listed above..."
                          className="min-h-[60px] bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-0.5 mt-1">
                      <Label className="text-xs">Doctor</Label>
                      <Select
                        name="doctorId"
                        value={formData.doctorId}
                        onValueChange={(value) => handleChange('doctorId', value)}
                      >
                        <SelectTrigger id="doctorId" className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
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
                )}

                {step === 2 && (
                  <div className="space-y-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      <div className="flex flex-col gap-0.5">
                        <Label className="text-xs">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => handleChange('date', e.target.value)}
                          className="h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                          min={new Date().toISOString().split('T')[0]} // Set minimum date to today
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <Label className="text-xs">Time</Label>
                        <Input
                          id="time"
                          type="time"
                          value={formData.time}
                          onChange={(e) => handleChange('time', e.target.value)}
                          className="h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5 mt-1">
                      <Label className="text-xs">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        placeholder="Any special instructions"
                        className="min-h-[60px] bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={step === 1 || isSubmitting}
                  size="sm"
                  className="h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200"
                >
                  Back
                </Button>
                {step < 2 ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={!formData.doctorId || (!formData.serviceId && !formData.customService)}
                    size="sm"
                    className="h-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    onClick={onSubmit}
                    disabled={isSubmitting || !formData.date || !formData.time}
                    size="sm"
                    className="h-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                  >
                    {isSubmitting ? "Booking..." : "Book Appointment"}
                  </Button>
                )}
              </div>
            </div>

            {/* Right Column - Appointment Summary */}
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium text-xs">Appointment Summary</h3>
                <div className="p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  {formData.serviceId && (
                    <div className="mb-3">
                      <div className="text-xs font-medium">Service</div>
                      <div className="text-[11px]">
                        {services.find(s => s.id === formData.serviceId)?.name || 'Unknown service'}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        ${services.find(s => s.id === formData.serviceId)?.price.toFixed(2) || '0.00'} - 
                        {services.find(s => s.id === formData.serviceId)?.duration || 0} minutes
                      </div>
                    </div>
                  )}

                  {!formData.serviceId && formData.customService && (
                    <div className="mb-3">
                      <div className="text-xs font-medium">Custom Service</div>
                      <div className="text-[11px]">{formData.customService}</div>
                    </div>
                  )}

                  {formData.doctorId && (
                    <div className="mb-3">
                      <div className="text-xs font-medium">Doctor</div>
                      <div className="text-[11px]">
                        {doctors.find(d => d.id === formData.doctorId)?.full_name || 'Unknown doctor'}
                      </div>
                    </div>
                  )}

                  {(formData.date || formData.time) && (
                    <div className="mb-3">
                      <div className="text-xs font-medium">Schedule</div>
                      <div className="text-[11px] flex gap-1">
                        {formData.date && (
                          <span>{new Date(formData.date).toLocaleDateString()}</span>
                        )}
                        {formData.time && (
                          <span>at {formData.time}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {formData.notes && (
                    <div className="mt-3">
                      <div className="text-xs font-medium">Notes</div>
                      <div className="text-[11px] text-gray-700">{formData.notes}</div>
                    </div>
                  )}
                  
                  {(!formData.serviceId && !formData.customService && !formData.doctorId && !formData.date && !formData.time) && (
                    <div className="text-center text-[11px] text-gray-500 italic py-4">
                      Complete the form to see appointment details
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 