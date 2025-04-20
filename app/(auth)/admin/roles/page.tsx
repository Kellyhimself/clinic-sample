"use client";

import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { useQuery } from "@tanstack/react-query";
import { getProfiles } from "@/lib/api/profiles";
import { Profile } from "@/types";

export default function RolesPage() {
  const { data: profiles, isLoading } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: getProfiles,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">User Roles</h1>
      <DataTable columns={columns} data={profiles || []} />
    </div>
  );
} 