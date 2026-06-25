import { supabase } from "@/integrations/supabase/client";

export type ProfileSearchResult = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export async function searchProfiles(
  query: string,
  excludeUserId: string,
): Promise<ProfileSearchResult[]> {
  const safeQuery = query.trim().replace(/[,()%*]/g, "");
  if (safeQuery.length < 2) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .or(`username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`)
    .neq("id", excludeUserId)
    .limit(20);

  if (error) throw error;
  return data ?? [];
}
