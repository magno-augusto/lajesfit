import { supabase } from "@/integrations/supabase/client";

export type AppNotification = {
  id: string;
  type: "like" | "comment" | "challenge_join";
  postId: string | null;
  commentId: string | null;
  readAt: string | null;
  createdAt: string;
  actor: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

type NotificationRow = {
  id: string;
  type: "like" | "comment" | "challenge_join";
  actor_id: string;
  post_id: string | null;
  comment_id: string | null;
  read_at: string | null;
  created_at: string;
};

export async function fetchNotifications(userId: string, limit = 30): Promise<AppNotification[]> {
  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id, type, actor_id, post_id, comment_id, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const actorIds = Array.from(new Set(rows.map((row) => row.actor_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", actorIds);
  if (profilesError) throw profilesError;

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return (rows as NotificationRow[]).map((row) => {
    const actor = profileMap.get(row.actor_id);
    return {
      id: row.id,
      type: row.type,
      postId: row.post_id,
      commentId: row.comment_id,
      readAt: row.read_at,
      createdAt: row.created_at,
      actor: {
        username: actor?.username ?? "user",
        displayName: actor?.display_name ?? "Atleta",
        avatarUrl: actor?.avatar_url ?? null,
      },
    };
  });
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
}
