export type TenantContext = {
    id: string;
    name: string;
    role: 'admin' | 'doctor' | 'cashier' | 'pharmacist' | 'patient';
  };