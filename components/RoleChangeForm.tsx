import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { setUserRole } from '@/lib/authActions';
import { Profile } from '@/types/supabase';

interface RoleChangeFormProps {
  user: Profile;
  onSuccess: () => void;
}

const roleSchema = z.object({
  role: z.enum(['admin', 'staff', 'patient', 'doctor', 'pharmacist']),
  phone_number: z.string().min(1, 'Phone number is required'),
  license_number: z.string().optional(),
  specialty: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  specialization: z.string().optional(),
  department: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export default function RoleChangeForm({ user, onSuccess }: RoleChangeFormProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      role: user.role,
      phone_number: user.phone_number || '',
    },
  });

  const role = watch('role');

  const onSubmit = async (data: z.infer<typeof roleSchema>) => {
    try {
      // Create a base form data object with common fields
      const formData = {
        full_name: user.full_name,
        phone_number: data.phone_number.trim(),
        role: data.role,
      };

      // Add role-specific fields based on the selected role
      switch (data.role) {
        case 'doctor':
          Object.assign(formData, {
            license_number: data.license_number?.trim() || '',
            specialty: data.specialty?.trim() || '',
            date_of_birth: data.date_of_birth?.trim() || '',
            gender: data.gender?.trim() || '',
            address: data.address?.trim() || '',
            specialization: null,
            department: data.department?.trim() || '',
            permissions: null,
          });
          break;
        case 'pharmacist':
          Object.assign(formData, {
            license_number: data.license_number?.trim() || '',
            specialization: data.specialization?.trim() || '',
            specialty: null,
            date_of_birth: null,
            gender: null,
            address: null,
            department: null,
            permissions: null,
          });
          break;
        case 'admin':
          Object.assign(formData, {
            department: data.department?.trim() || '',
            permissions: data.permissions || [],
            license_number: null,
            specialty: null,
            date_of_birth: null,
            gender: null,
            address: null,
            specialization: null,
          });
          break;
        case 'patient':
          Object.assign(formData, {
            date_of_birth: data.date_of_birth?.trim() || '',
            gender: data.gender?.trim() || '',
            address: data.address?.trim() || '',
            license_number: null,
            specialty: null,
            specialization: null,
            department: null,
            permissions: null,
          });
          break;
        case 'staff':
          Object.assign(formData, {
            license_number: null,
            specialty: null,
            date_of_birth: null,
            gender: null,
            address: null,
            specialization: null,
            department: null,
            permissions: null,
          });
          break;
      }

      console.log('Submitting form data:', formData);
      await setUserRole({
        ...formData,
        user_id: user.id
      });
      toast.success('Role updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Full Name</label>
        <input
          type="text"
          value={user.full_name}
          readOnly
          className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      {role === 'pharmacist' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">License Number</label>
            <input
              type="text"
              {...register('license_number')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.license_number && (
              <p className="mt-1 text-sm text-red-600">{errors.license_number.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Specialization</label>
            <input
              type="text"
              {...register('specialization')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.specialization && (
              <p className="mt-1 text-sm text-red-600">{errors.specialization.message}</p>
            )}
          </div>
        </div>
      )}
    </form>
  );
} 