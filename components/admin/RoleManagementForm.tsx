"use client";

import { useState } from "react";
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

type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

type RoleManagementFormProps = {
  user: User;
  onSuccess?: () => void;
};

export default function RoleManagementForm({ user, onSuccess }: RoleManagementFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    role: user.role,
    license_number: "",
    specialty: "",
    date_of_birth: "",
    gender: "",
    address: "",
    department: "",
    permissions: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const form = new FormData();
      form.append("userId", user.id);
      form.append("role", formData.role);
      form.append("currentRole", user.role);

      // Add role-specific data
      if (formData.role === "doctor") {
        form.append("license_number", formData.license_number);
        form.append("specialty", formData.specialty);
      } else if (formData.role === "patient") {
        form.append("date_of_birth", formData.date_of_birth);
        form.append("gender", formData.gender);
        form.append("address", formData.address);
      } else if (formData.role === "pharmacist") {
        form.append("license_number", formData.license_number);
        form.append("specialization", formData.specialty);
      } else if (formData.role === "admin") {
        form.append("department", formData.department);
        form.append("permissions", formData.permissions);
      }

      await setUserRole(form);
      toast.success("Role updated successfully");
      onSuccess?.();
    } catch (error) {
      console.error("Role update error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  const renderRoleSpecificFields = () => {
    switch (formData.role) {
      case "doctor":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="license_number">License Number</Label>
              <Input
                id="license_number"
                value={formData.license_number}
                onChange={(e) =>
                  setFormData({ ...formData, license_number: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Specialty</Label>
              <Input
                id="specialty"
                value={formData.specialty}
                onChange={(e) =>
                  setFormData({ ...formData, specialty: e.target.value })
                }
                required
              />
            </div>
          </>
        );
      case "patient":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) =>
                  setFormData({ ...formData, date_of_birth: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) =>
                  setFormData({ ...formData, gender: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
          </>
        );
      case "pharmacist":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="license_number">License Number</Label>
              <Input
                id="license_number"
                value={formData.license_number}
                onChange={(e) =>
                  setFormData({ ...formData, license_number: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Specialization</Label>
              <Input
                id="specialty"
                value={formData.specialty}
                onChange={(e) =>
                  setFormData({ ...formData, specialty: e.target.value })
                }
              />
            </div>
          </>
        );
      case "admin":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permissions">Permissions (comma-separated)</Label>
              <Input
                id="permissions"
                value={formData.permissions}
                onChange={(e) =>
                  setFormData({ ...formData, permissions: e.target.value })
                }
                placeholder="e.g., manage_users,manage_inventory"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => setFormData({ ...formData, role: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="patient">Patient</SelectItem>
            <SelectItem value="doctor">Doctor</SelectItem>
            <SelectItem value="pharmacist">Pharmacist</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {renderRoleSpecificFields()}

      <Button type="submit" disabled={loading}>
        {loading ? "Updating..." : "Update Role"}
      </Button>
    </form>
  );
} 