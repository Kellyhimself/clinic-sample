export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentMethod = 'mpesa' | 'cash' | 'bank';

export interface Appointment {
  id: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
  transaction_id: string | null;
  service_id?: string;
  patient_id?: string;
  doctor_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithDetails extends Appointment {
  service?: {
    name: string;
    price: number;
    duration: number;
  };
  profiles?: {
    full_name: string;
  };
} 