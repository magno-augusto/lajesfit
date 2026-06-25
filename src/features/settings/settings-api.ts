import { supabase } from "@/integrations/supabase/client";

export type ProfileSettings = {
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
};

export async function getProfileSettings(userId: string): Promise<ProfileSettings | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function updateProfileSettings(
  userId: string,
  updates: { display_name: string; bio: string | null; avatar_url: string | null },
) {
  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (error) throw error;
}

export async function uploadAvatar(userId: string, file: File) {
  const path = `${userId}/avatar-${Date.now()}`;
  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(path, file, { upsert: true });
  if (uploadError) throw new Error("Erro no upload");

  const { data: signed } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  const url = signed?.signedUrl ?? null;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", userId);
  if (updateError) throw updateError;

  return url;
}
