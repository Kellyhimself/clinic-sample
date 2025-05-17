'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import GuestPatientDialog from './GuestPatientDialog';
import { Patient } from '@/types/supabase';
import { handleBooking } from '@/lib/authActions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Doctor {
  id: string;
  full_name: string;
  specialty?: string;
}

interface AppointmentBookingSectionProps {
  services: Service[];
  doctors: Doctor[];
  patients: Patient[];
}

export default function AppointmentBookingSection({ 
  services, 
  doctors, 
  patients 
}: AppointmentBookingSectionProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customService, setCustomService] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [notes, setNotes] = useState('');
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [duration, setDuration] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredPatients([]);
      return;
    }

    const filtered = patients.filter(patient => 
      patient.full_name.toLowerCase().includes(query.toLowerCase()) ||
      (patient.phone_number && patient.phone_number.includes(query))
    );
    setFilteredPatients(filtered);
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.full_name);
    setFilteredPatients([]);
    setStep(2);
  };

  const handleGuestPatientCreated = async (patient: Patient) => {
    try {
      console.log('Using newly created guest patient:', patient);
      
      setSelectedPatient(patient);
      setSearchQuery(patient.full_name);
      setFilteredPatients([]);
      setStep(2);
      toast.success(`New guest patient ${patient.full_name} created and selected`);
    } catch (error) {
      console.error("Error processing guest patient:", error);
      toast.error("Error processing guest patient");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDoctor || (!selectedService && !customService) || !selectedDate || !selectedTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!selectedPatient) {
      toast.error('Please select a patient or create a new one');
      return;
    }

    setIsBooking(true);

    try {
      const formData = new FormData();
      formData.append('doctorId', selectedDoctor);
      formData.append('date', selectedDate);
      formData.append('time', selectedTime);
      
      if (selectedService) {
        formData.append('serviceId', selectedService);
      } else if (customService) {
        formData.append('customService', customService);
      }
      
      if (notes) {
        formData.append('notes', notes);
      }
      
      const patientId = selectedPatient.id;

      const result = await handleBooking(formData, {
        isStaffBooking: true,
        patientId: patientId
      });

      if (result.success) {
        toast.success('Appointment booked successfully!');
        
        setSelectedService('');
        setSelectedDoctor('');
        setSelectedDate('');
        setSelectedTime('');
        setCustomService('');
        setSearchQuery('');
        setSelectedPatient(null);
        setNotes('');
        setStep(1);

        router.push('/appointments');
      } else {
        toast.error(result.message || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-2">
      <div className="w-full max-w-[1400px] mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-800">Book New Appointment</h2>
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Schedule a new appointment for a patient
          </div>
        </div>

        <div className="p-4">
          <div className="flex justify-center mb-3">
            <div className="flex items-center space-x-1">
              {[1, 2, 3].map((stepNumber) => (
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
                  {stepNumber < 3 && (
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

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="col-span-3 space-y-4">
              <div className="space-y-2">
                {step === 1 && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Search Patient</Label>
                      <GuestPatientDialog 
                        onPatientCreated={handleGuestPatientCreated} 
                        triggerButtonText="Add Guest" 
                      />
                    </div>
                    <Input
                      type="text"
                      placeholder="Search by name or phone"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                    />
                    <div className="max-h-[150px] overflow-y-auto">
                      {filteredPatients.map((patient) => (
                        <div
                          key={patient.id}
                          className={`p-1 border rounded-lg mb-0.5 cursor-pointer hover:bg-blue-50 flex flex-col ${
                            selectedPatient?.id === patient.id ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200' : ''
                          }`}
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <div className="font-medium text-xs">{patient.full_name}</div>
                          <div className="text-[10px] text-gray-500">
                            {patient.patient_type === 'guest' && <span className="bg-amber-100 text-amber-800 px-1 rounded-sm mr-1">Guest</span>}
                            {patient.phone_number || 'No phone'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-1">
                    <div className="flex flex-col gap-0.5">
                      <Label className="text-xs">Service</Label>
                      <Select
                        value={selectedService}
                        onValueChange={(value) => {
                          setSelectedService(value);
                          setCustomService('');
                        }}
                      >
                        <SelectTrigger className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 h-8">
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">Custom Service</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {selectedService === 'custom' && (
                        <Input
                          placeholder="Enter custom service name"
                          value={customService}
                          onChange={(e) => setCustomService(e.target.value)}
                          className="mt-1 h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                        />
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5 mt-1">
                      <Label className="text-xs">Doctor</Label>
                      <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                        <SelectTrigger className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 h-8">
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

                {step === 3 && (
                  <div className="space-y-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      <div className="flex flex-col gap-0.5">
                        <Label className="text-xs">Date</Label>
                        <Input
                          id="date"
                          type="datetime-local"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <Label className="text-xs">Time</Label>
                        <Input
                          id="time"
                          type="time"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          className="h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5 mt-1">
                      <Label className="text-xs">Duration</Label>
                      <Input
                        type="text"
                        placeholder="Enter appointment duration in minutes"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5 mt-1">
                      <Label className="text-xs">Notes (Optional)</Label>
                      <Textarea
                        placeholder="Enter any additional notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={step === 1 || isBooking}
                  size="sm"
                  className="h-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200"
                >
                  Back
                </Button>
                {step < 3 ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={(step === 1 && !selectedPatient) || 
                             (step === 2 && (!selectedService && !customService || !selectedDoctor))}
                    size="sm"
                    className="h-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmit}
                    disabled={isBooking || !selectedDate || !selectedTime}
                    size="sm"
                    className="h-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                  >
                    {isBooking ? "Booking..." : "Book Appointment"}
                  </Button>
                )}
              </div>
            </div>

            <div className="col-span-2 space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium text-xs">Appointment Summary</h3>
                <div className="p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <div className="text-xs font-medium text-gray-800">Patient</div>
                  <div className="text-[11px] flex items-center text-gray-600">
                    {selectedPatient ? (
                      <>
                        <User className="h-3 w-3 mr-1" />
                        {selectedPatient.full_name}
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-500">No patient selected</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500">{selectedPatient?.phone_number}</div>

                  <div className="text-xs font-medium text-gray-800">Service</div>
                  <div className="text-[11px] text-gray-600">
                    {typeof selectedService === 'object' && selectedService !== null ? (
                      <>
                        {selectedService.name}
                        <div className="text-[10px] text-gray-500">
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(selectedService.price)}
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-500">No service selected</span>
                    )}
                  </div>

                  <div className="text-xs font-medium text-gray-800">Doctor</div>
                  <div className="text-[11px] text-gray-600">
                    {selectedDoctor ? (
                      <>
                        {selectedDoctor}
                        <div className="text-[10px] text-gray-500">{doctors.find(d => d.id === selectedDoctor)?.specialty}</div>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-500">No doctor selected</span>
                    )}
                  </div>

                  <div className="text-xs font-medium text-gray-800">Schedule</div>
                  <div className="text-[11px] flex gap-1 text-gray-600">
                    {selectedDate ? (
                      <>
                        <Calendar className="h-3 w-3" />
                        {format(new Date(selectedDate), 'MMM dd, yyyy')}
                        <Clock className="h-3 w-3 ml-2" />
                        {format(new Date(selectedDate), 'hh:mm a')}
                        {duration && ` (${duration} min)`}
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-500">No date/time selected</span>
                    )}
                  </div>

                  <div className="text-xs font-medium text-gray-800">Notes</div>
                  <div className="text-[11px] text-gray-700">{notes}</div>
                  
                  <div className="text-center text-[11px] text-gray-500 italic py-4">
                    {isBooking ? 'Saving appointment...' : 'Review the details before confirming'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 