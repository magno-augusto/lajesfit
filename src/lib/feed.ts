import { supabase } from "@/integrations/supabase/client";

export type FeedPost = {
  id: string;
  user_id: string;
  type: "general" | "workout" | "diet";
  content: string | null;
  media_urls: string[];
  created_at: string;
  workout_id: string | null;
  profile: { username: string; display_name: string; avatar_url: string | null } | null;
  workout: { activity_type: string; distance_meters: number | null; duration_seconds: number | null; calories: number | null; name: string | null } | null;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
};

export async function getMediaUrl(path: string): Promise<string> {
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from("media").createSignedUrl(path, 3600);
  return data?.signedUrl ?? "";
}

export async function fetchFeed(currentUserId: string): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select(`
      id, user_id, type, content, media_urls, created_at, workout_id,
      profile:profiles!posts_user_id_fkey(username, display_name, avatar_url),
      workout:workouts(activity_type, distance_meters, duration_seconds, calories, name)
    `)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  const ids = (posts ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  const [{ data: likes }, { data: myLikes }, { data: comments }] = await Promise.all([
    supabase.from("post_likes").select("post_id").in("post_id", ids),
    supabase.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", currentUserId),
    supabase.from("post_comments").select("post_id").in("post_id", ids),
  ]);

  const likeMap = new Map<string, number>();
  likes?.forEach((l) => likeMap.set(l.post_id, (likeMap.get(l.post_id) ?? 0) + 1));
  const commentMap = new Map<string, number>();
  comments?.forEach((c) => commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1));
  const myLikeSet = new Set(myLikes?.map((l) => l.post_id));

  // Resolve signed URLs for media
  const resolved = await Promise.all(
    (posts ?? []).map(async (p: any) => ({
      ...p,
      media_urls: await Promise.all((p.media_urls as string[]).map(getMediaUrl)),
      likes_count: likeMap.get(p.id) ?? 0,
      comments_count: commentMap.get(p.id) ?? 0,
      liked_by_me: myLikeSet.has(p.id),
    }))
  );
  return resolved as FeedPost[];
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDistance(meters: number | null | undefined) {
  if (!meters) return "—";
  return `${(meters / 1000).toFixed(2)} km`;
}

export function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}
