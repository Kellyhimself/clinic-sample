"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { setUserRole } from "@/lib/authActions";
import { Profile } from "@/types/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type RoleFormData = {
  role: "admin" | "staff" | "patient" | "doctor" | "pharmacist";
  license_number?: string;
  specialty?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  specialization?: string;
  department?: string;
  permissions?: string;
};

const roleSchema = z.object({
  role: z.enum(["admin", "staff", "patient", "doctor", "pharmacist"]),
  license_number: z.string().optional(),
  specialty: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  specialization: z.string().optional(),
  department: z.string().optional(),
  permissions: z.string().optional(),
}).superRefine((data, ctx) => {
  // Only validate required fields based on the selected role
  switch (data.role) {
    case "doctor":
    case "pharmacist":
      if (!data.license_number) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "License number is required for this role",
          path: ["license_number"],
        });
      }
      if (!data.specialty) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Specialty is required for this role",
          path: ["specialty"],
        });
      }
      break;
    case "patient":
      if (!data.date_of_birth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date of birth is required for patients",
          path: ["date_of_birth"],
        });
      }
      if (!data.gender) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Gender is required for patients",
          path: ["gender"],
        });
      }
      if (!data.address) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Address is required for patients",
          path: ["address"],
        });
      }
      break;
    case "staff":
      if (!data.department) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Department is required for staff",
          path: ["department"],
        });
      }
      break;
  }
});

interface RoleChangeFormProps {
  user: Profile;
  onSuccess: () => void;
}

export default function RoleChangeForm({ user, onSuccess }: RoleChangeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleFormData["role"] | null>(null);

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      role: user.role,
      license_number: user.license_number || "",
      specialty: user.specialty || "",
      date_of_birth: user.date_of_birth || "",
      gender: user.gender || "",
      address: user.address || "",
      specialization: user.specialization || "",
      department: user.department || "",
      permissions: user.permissions || "",
    },
  });

  const handleRoleSelect = (role: RoleFormData["role"]) => {
    setSelectedRole(role);
    form.reset({
      role: role,
      license_number: "",
      specialty: "",
      date_of_birth: "",
      gender: "",
      address: "",
      specialization: "",
      department: "",
      permissions: "",
    });
    setShowForm(true);
  };

  const onSubmit = async (data: RoleFormData) => {
    console.log("Form submitted with data:", data);
    setIsSubmitting(true);
    try {
      // Create a plain object with required fields
      const roleData = {
        user_id: user.id,
        full_name: user.full_name,
        role: data.role,
      };

      // Add role-specific fields based on the selected role
      switch (data.role) {
        case "doctor":
        if (!data.license_number || !data.specialty) {
            throw new Error("License number and specialty are required for doctors");
          }
          Object.assign(roleData, {
            license_number: data.license_number,
            specialty: data.specialty,
            department: data.department || "",
          });
          break;

        case "pharmacist":
          if (!data.license_number) {
            throw new Error("License number is required for pharmacists");
          }
          Object.assign(roleData, {
            license_number: data.license_number,
            specialization: data.specialization || "",
          });
          break;

        case "patient":
        if (!data.date_of_birth || !data.gender || !data.address) {
          throw new Error("Date of birth, gender, and address are required for patients");
        }
          Object.assign(roleData, {
            date_of_birth: data.date_of_birth,
            gender: data.gender,
            address: data.address,
          });
          break;

        case "admin":
          Object.assign(roleData, {
            permissions: data.permissions ? [data.permissions] : undefined,
          });
          break;

        case "staff":
          Object.assign(roleData, {
            department: data.department || "",
          });
          break;
      }

      await setUserRole(roleData);
      toast.success("Role updated successfully");
      onSuccess();
      setShowForm(false);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPatientFields = () => (
    <>
      <div className="space-y-2">
        <Label>Date of Birth <span className="text-blue-500">*</span></Label>
        <Input 
          type="date" 
          {...form.register("date_of_birth")} 
          required 
          className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
        {form.formState.errors.date_of_birth && (
          <p className="text-sm text-red-500">{form.formState.errors.date_of_birth.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Gender <span className="text-blue-500">*</span></Label>
        <Select 
          onValueChange={(value) => form.setValue("gender", value)}
          value={form.watch("gender")}
        >
          <SelectTrigger className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.gender && (
          <p className="text-sm text-red-500">{form.formState.errors.gender.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Address <span className="text-blue-500">*</span></Label>
        <Input 
          {...form.register("address")} 
          placeholder="Enter full address" 
          required 
          className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
        />
        {form.formState.errors.address && (
          <p className="text-sm text-red-500">{form.formState.errors.address.message}</p>
        )}
      </div>
    </>
  );

  const getRoleSpecificFields = () => {
    if (!selectedRole) return null;

    switch (selectedRole) {
      case "admin":
        return (
          <div className="space-y-2">
            <Label>Permissions</Label>
            <Select 
              onValueChange={(value) => form.setValue("permissions", value)}
              value={form.watch("permissions")}
            >
              <SelectTrigger className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                <SelectValue placeholder="Select permissions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_access">Full Access</SelectItem>
                <SelectItem value="limited_access">Limited Access</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "doctor":
        return (
          <>
            <div className="space-y-2">
              <Label>License Number <span className="text-blue-500">*</span></Label>
              <Input 
                {...form.register("license_number")} 
                placeholder="Enter medical license number" 
                required 
                className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
              />
              {form.formState.errors.license_number && (
                <p className="text-sm text-red-500">{form.formState.errors.license_number.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Specialty <span className="text-blue-500">*</span></Label>
              <Select 
                onValueChange={(value) => form.setValue("specialty", value)}
                value={form.watch("specialty")}
              >
                <SelectTrigger className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Practice</SelectItem>
                  <SelectItem value="pediatrics">Pediatrics</SelectItem>
                  <SelectItem value="surgery">Surgery</SelectItem>
                  <SelectItem value="internal_medicine">Internal Medicine</SelectItem>
                  <SelectItem value="obstetrics">Obstetrics & Gynecology</SelectItem>
                  <SelectItem value="cardiology">Cardiology</SelectItem>
                  <SelectItem value="neurology">Neurology</SelectItem>
                  <SelectItem value="orthopedics">Orthopedics</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.specialty && (
                <p className="text-sm text-red-500">{form.formState.errors.specialty.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select 
                onValueChange={(value) => form.setValue("department", value)}
                value={form.watch("department")}
              >
                <SelectTrigger className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="outpatient">Outpatient</SelectItem>
                  <SelectItem value="inpatient">Inpatient</SelectItem>
                  <SelectItem value="surgery">Surgery</SelectItem>
                  <SelectItem value="pediatrics">Pediatrics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Specialization</Label>
              <Input 
                {...form.register("specialization")} 
                placeholder="Enter additional specializations" 
                className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
              />
            </div>
          </>
        );

      case "pharmacist":
        return (
          <>
            <div className="space-y-2">
              <Label>License Number <span className="text-blue-500">*</span></Label>
              <Input 
                {...form.register("license_number")} 
                placeholder="Enter pharmacy license number" 
                required 
                className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
              />
              {form.formState.errors.license_number && (
                <p className="text-sm text-red-500">{form.formState.errors.license_number.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Specialty <span className="text-blue-500">*</span></Label>
              <Select 
                {...form.register("specialty")}
                onValueChange={(value) => form.setValue("specialty", value)}
              >
                <SelectTrigger className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <SelectValue placeholder="Select pharmacy specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinical">Clinical Pharmacy</SelectItem>
                  <SelectItem value="hospital">Hospital Pharmacy</SelectItem>
                  <SelectItem value="retail">Retail Pharmacy</SelectItem>
                  <SelectItem value="industrial">Industrial Pharmacy</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.specialty && (
                <p className="text-sm text-red-500">{form.formState.errors.specialty.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Specialization</Label>
              <Input 
                {...form.register("specialization")} 
                placeholder="Enter additional specializations" 
                className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
              />
            </div>
          </>
        );

      case "patient":
        return renderPatientFields();

      case "staff":
        return (
          <div className="space-y-2">
            <Label>Department <span className="text-blue-500">*</span></Label>
            <Select 
              onValueChange={(value) => form.setValue("department", value)}
              value={form.watch("department")}
            >
              <SelectTrigger className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reception">Reception</SelectItem>
                <SelectItem value="nursing">Nursing</SelectItem>
                <SelectItem value="laboratory">Laboratory</SelectItem>
                <SelectItem value="radiology">Radiology</SelectItem>
                <SelectItem value="administration">Administration</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.department && (
              <p className="text-sm text-red-500">{form.formState.errors.department.message}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full">
        {!showForm ? (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleRoleSelect("staff")}
                className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 w-full h-12 sm:h-auto"
                >
                  Staff
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRoleSelect("patient")}
                className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 w-full h-12 sm:h-auto"
                >
                  Patient
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRoleSelect("doctor")}
                className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 w-full h-12 sm:h-auto"
                >
                  Doctor
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRoleSelect("pharmacist")}
                className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 w-full h-12 sm:h-auto"
                >
                  Pharmacist
                </Button>
              <Button
                variant="outline"
                onClick={() => handleRoleSelect("admin")}
                className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 w-full h-12 sm:h-auto sm:col-span-2"
              >
                Admin
                </Button>
              </div>
            </div>
          </>
        ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {getRoleSpecificFields()}
                {form.formState.errors.role && (
                  <p className="text-sm text-red-500">{form.formState.errors.role.message}</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
              className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 w-full sm:w-auto h-12 sm:h-auto"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 w-full sm:w-auto h-12 sm:h-auto"
                >
              {isSubmitting ? "Updating..." : "Update Profile"}
                </Button>
              </div>
            </form>
        )}
    </div>
  );
} 