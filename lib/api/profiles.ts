import { fetchAllProfiles } from "@/lib/authActions";
import { Profile } from "@/types";

export async function getProfiles(): Promise<Profile[]> {
  return fetchAllProfiles();
} 