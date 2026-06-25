import { supabase } from "@/integrations/supabase/client";

export type PostComment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
};

export async function fetchComments(postId: string): Promise<PostComment[]> {
  const { data: comments, error } = await supabase
    .from("post_comments")
    .select("id, post_id, user_id, content, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!comments || comments.length === 0) return [];

  const userIds = Array.from(new Set(comments.map((c) => c.user_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);
  if (profilesError) throw profilesError;

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  return comments.map((comment) => {
    const profile = profileMap.get(comment.user_id);
    return {
      id: comment.id,
      postId: comment.post_id,
      userId: comment.user_id,
      content: comment.content,
      createdAt: comment.created_at,
      profile: {
        username: profile?.username ?? "user",
        display_name: profile?.display_name ?? "Atleta",
        avatar_url: profile?.avatar_url ?? null,
      },
    };
  });
}

export async function addComment(postId: string, userId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Escreva um comentario antes de enviar");

  const { error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, user_id: userId, content: trimmed });
  if (error) throw error;
}

export async function deleteComment(commentId: string, userId: string) {
  const { error } = await supabase
    .from("post_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);
  if (error) throw error;
}
