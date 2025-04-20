import { ColumnDef } from "@tanstack/react-table";
import { Profile } from "@/types";

export const columns: ColumnDef<Profile>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "full_name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "phone_number",
    header: "Phone Number",
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => {
      const date = row.getValue("created_at");
      return date ? new Date(date as string).toLocaleDateString() : "N/A";
    },
  },
]; 