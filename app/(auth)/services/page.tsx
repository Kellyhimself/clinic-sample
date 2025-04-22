import { Metadata } from 'next';
import ServicesManager from '@/components/services/ServicesManager';

export const metadata: Metadata = {
  title: 'Clinical Services Management',
  description: 'Manage clinical services and treatments provided to patients',
};

export default function ServicesPage() {
  return <ServicesManager />;
} 