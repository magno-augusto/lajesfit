import { supabase } from "@/integrations/supabase/client";

export async function likePost(userId: string, postId: string) {
  const { error } = await supabase.from("post_likes").insert({ user_id: userId, post_id: postId });
  if (error && error.code !== "23505") throw error;
}

export async function unlikePost(userId: string, postId: string) {
  const { error } = await supabase
    .from("post_likes")
    .delete()
    .eq("user_id", userId)
    .eq("post_id", postId);
  if (error) throw error;
}
