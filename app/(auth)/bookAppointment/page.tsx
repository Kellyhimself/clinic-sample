// app/(auth)/book-appointment/page.tsx
import { fetchServices, bookAppointment } from "@/lib/authActions";
import { getSupabaseClient } from "@/lib/supabase";
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
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function BookAppointmentPage() {
  const supabase = await getSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('BookAppointmentPage - No user authenticated, redirecting to login');
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.log('BookAppointmentPage - Profile fetch failed, defaulting to patient');
  }

  const userRole = profile?.role || 'patient';
  console.log('BookAppointmentPage - Determined userRole:', userRole);

  if (userRole !== "patient") {
    console.log('BookAppointmentPage - Redirecting because userRole is not "patient", actual role:', userRole);
    redirect("/appointments");
  }

  console.log('BookAppointmentPage - Proceeding as patient');

  const services = await fetchServices();

  async function handleBooking(formData: FormData) {
    "use server";
    await bookAppointment(formData);
    revalidatePath("/appointments");
    redirect("/appointments");
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-semibold mb-6">Book an Appointment</h1>
      <form action={handleBooking} className="space-y-4">
        <div>
          <Label htmlFor="serviceId">Service</Label>
          <Select name="serviceId">
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
            placeholder="Describe your service if not listed above..."
            className="min-h-[100px]"
          />
        </div>

        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            type="date"
            id="date"
            name="date"
            required
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div>
          <Label htmlFor="time">Time</Label>
          <Input type="time" id="time" name="time" required />
        </div>

        <div>
          <Label htmlFor="notes">Additional Notes (optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Any additional details..."
            className="min-h-[100px]"
          />
        </div>

        <Button type="submit" className="w-full">
          Book Appointment
        </Button>
      </form>
    </div>
  );
}