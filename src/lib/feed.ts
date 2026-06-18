import { supabase } from "@/integrations/supabase/client";

export type FeedPost = {
  id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  user_id: string;
  author: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
};

export async function fetchFeed(currentUserId: string): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, content, media_url, created_at, user_id, author:profiles!posts_user_id_fkey(username, display_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const ids = posts.map((p) => p.id);

  const [{ data: likes }, { data: comments }, { data: myLikes }] = await Promise.all([
    supabase.from("post_likes").select("post_id").in("post_id", ids),
    supabase.from("post_comments").select("post_id").in("post_id", ids),
    supabase.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", currentUserId),
  ]);

  const likesMap = new Map<string, number>();
  (likes ?? []).forEach((l) => likesMap.set(l.post_id, (likesMap.get(l.post_id) ?? 0) + 1));
  const commentsMap = new Map<string, number>();
  (comments ?? []).forEach((c) => commentsMap.set(c.post_id, (commentsMap.get(c.post_id) ?? 0) + 1));
  const likedSet = new Set((myLikes ?? []).map((l) => l.post_id));

  return posts.map((p) => ({
    id: p.id,
    content: p.content,
    media_url: p.media_url,
    created_at: p.created_at,
    user_id: p.user_id,
    author: p.author ?? { username: "user", display_name: "Atleta", avatar_url: null },
    likes_count: likesMap.get(p.id) ?? 0,
    comments_count: commentsMap.get(p.id) ?? 0,
    liked_by_me: likedSet.has(p.id),
  }));
}
