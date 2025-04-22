import { Metadata } from 'next';
import ServiceCategoriesManager from '@/components/services/ServiceCategoriesManager';

export const metadata: Metadata = {
  title: 'Service Categories',
  description: 'Manage clinical service categories and specialties',
};

export default function ServiceCategoriesPage() {
  return (
    <ServiceCategoriesManager />
  );
} 