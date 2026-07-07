import { supabase } from "@/integrations/supabase/client";

export type NotificationPreferences = {
  notify_likes: boolean;
  notify_comments: boolean;
  notify_follows: boolean;
  notify_challenges: boolean;
};

export type ProfileSettings = {
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  recovery_email: string | null;
  is_admin: boolean;
  is_private: boolean;
  notifications_enabled: boolean;
} & NotificationPreferences;

export async function getProfileSettings(userId: string): Promise<ProfileSettings | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "username, display_name, bio, avatar_url, recovery_email, is_admin, is_private, notifications_enabled, notify_likes, notify_comments, notify_follows, notify_challenges",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function updateNotificationPreference(
  userId: string,
  updates: Partial<NotificationPreferences>,
) {
  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (error) throw error;
}

export async function updateNotificationsEnabled(userId: string, enabled: boolean) {
  const { error } = await supabase
    .from("profiles")
    .update({ notifications_enabled: enabled })
    .eq("id", userId);
  if (error) throw error;
}

export async function updateRecoveryEmail(userId: string, recoveryEmail: string | null) {
  const { error } = await supabase
    .from("profiles")
    .update({ recovery_email: recoveryEmail })
    .eq("id", userId);
  if (error) throw error;
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
