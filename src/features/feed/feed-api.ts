import { supabase } from "@/integrations/supabase/client";

export type FeedPost = {
  id: string;
  type: "general" | "workout" | "diet";
  content: string;
  media_urls: string[];
  created_at: string;
  user_id: string;
  workout_id: string | null;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  workout: {
    activity_type: string;
    distance_meters: number | null;
    duration_seconds: number | null;
    calories: number | null;
    name: string | null;
  } | null;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
};

function inferPostType(content: string): FeedPost["type"] {
  return content.startsWith("Cafe da manha registrado") ||
    content.startsWith("Almoco registrado") ||
    content.startsWith("Lanche registrado") ||
    content.startsWith("Jantar registrado")
    ? "diet"
    : "general";
}

export const FEED_PAGE_SIZE = 20;

export async function fetchFeed(
  currentUserId: string,
  options: { before?: string; limit?: number } = {},
): Promise<FeedPost[]> {
  const limit = options.limit ?? FEED_PAGE_SIZE;
  let postsQuery = supabase
    .from("posts")
    .select("id, content, media_url, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.before) {
    postsQuery = postsQuery.lt("created_at", options.before);
  }

  const { data: posts, error } = await postsQuery;

  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const ids = posts.map((p) => p.id);
  const userIds = Array.from(new Set(posts.map((p) => p.user_id)));

  const [{ data: authors }, { data: likes }, { data: comments }, { data: myLikes }] =
    await Promise.all([
      supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds),
      supabase.from("post_likes").select("post_id").in("post_id", ids),
      supabase.from("post_comments").select("post_id").in("post_id", ids),
      supabase.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", currentUserId),
    ]);

  const authorMap = new Map((authors ?? []).map((a) => [a.id, a]));
  const likesMap = new Map<string, number>();
  (likes ?? []).forEach((l) => likesMap.set(l.post_id, (likesMap.get(l.post_id) ?? 0) + 1));
  const commentsMap = new Map<string, number>();
  (comments ?? []).forEach((c) =>
    commentsMap.set(c.post_id, (commentsMap.get(c.post_id) ?? 0) + 1),
  );
  const likedSet = new Set((myLikes ?? []).map((l) => l.post_id));

  return posts.map((p) => {
    const a = authorMap.get(p.user_id);
    return {
      id: p.id,
      content: p.content,
      created_at: p.created_at,
      user_id: p.user_id,
      type: inferPostType(p.content),
      media_urls: p.media_url ? [p.media_url] : [],
      workout_id: null,
      profile: {
        username: a?.username ?? "user",
        display_name: a?.display_name ?? "Atleta",
        avatar_url: a?.avatar_url ?? null,
      },
      workout: null,
      likes_count: likesMap.get(p.id) ?? 0,
      comments_count: commentsMap.get(p.id) ?? 0,
      liked_by_me: likedSet.has(p.id),
    };
  });
}

export async function fetchProfilePosts(
  profileUserId: string,
  currentUserId: string,
): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, content, media_url, created_at, user_id")
    .eq("user_id", profileUserId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const ids = posts.map((p) => p.id);

  const [{ data: author }, { data: likes }, { data: comments }, { data: myLikes }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", profileUserId)
        .maybeSingle(),
      supabase.from("post_likes").select("post_id").in("post_id", ids),
      supabase.from("post_comments").select("post_id").in("post_id", ids),
      supabase.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", currentUserId),
    ]);

  const likesMap = new Map<string, number>();
  (likes ?? []).forEach((l) => likesMap.set(l.post_id, (likesMap.get(l.post_id) ?? 0) + 1));
  const commentsMap = new Map<string, number>();
  (comments ?? []).forEach((c) =>
    commentsMap.set(c.post_id, (commentsMap.get(c.post_id) ?? 0) + 1),
  );
  const likedSet = new Set((myLikes ?? []).map((l) => l.post_id));

  return posts.map((p) => ({
    id: p.id,
    content: p.content,
    created_at: p.created_at,
    user_id: p.user_id,
    type: inferPostType(p.content),
    media_urls: p.media_url ? [p.media_url] : [],
    workout_id: null,
    profile: {
      username: author?.username ?? "user",
      display_name: author?.display_name ?? "Atleta",
      avatar_url: author?.avatar_url ?? null,
    },
    workout: null,
    likes_count: likesMap.get(p.id) ?? 0,
    comments_count: commentsMap.get(p.id) ?? 0,
    liked_by_me: likedSet.has(p.id),
  }));
}

export async function deletePost(postId: string, userId: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", userId);
  if (error) throw error;
}
