"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllProfiles } from "@/lib/authActions";
import { Profile } from "@/types/supabase";
import UsersTable from "@/components/UsersTable";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RolesPage() {
  const router = useRouter();
  const { data: profiles, isLoading } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: fetchAllProfiles,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>User Roles Management</CardTitle>
          </div>
        </CardHeader>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-gray-50 p-4 md:p-6">
          <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
            {profiles && <UsersTable profiles={profiles} />}
          </div>
        </div>
      </Card>
    </div>
  );
} 