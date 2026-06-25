import { supabase } from "@/integrations/supabase/client";

export async function uploadPostMedia(userId: string, file: File) {
  const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (error) throw error;
  return data.signedUrl;
}

export async function createPost(params: {
  userId: string;
  content: string;
  mediaUrl: string | null;
}) {
  const { error } = await supabase
    .from("posts")
    .insert({ user_id: params.userId, content: params.content, media_url: params.mediaUrl });
  if (error) throw error;
}
