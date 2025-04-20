export interface Doctor {
  id: string;
  full_name: string;
  role: string;
  specialization?: string;
  qualifications?: string[];
  available_days?: string[];
  available_hours?: {
    start: string;
    end: string;
  };
} 