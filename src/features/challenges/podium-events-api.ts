import { supabase } from "@/integrations/supabase/client";

export type PodiumEntry = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  value: number;
};

export type PodiumEvent = {
  id: string;
  board: string;
  periodMonth: string;
  eventDate: string;
  top3: PodiumEntry[];
  sharedAt: string | null;
  createdAt: string;
};

type PodiumEventRow = {
  id: string;
  board: string;
  period_month: string;
  event_date: string;
  top3: unknown;
  shared_at: string | null;
  created_at: string;
};

type PodiumEntryJson = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  value: number | string | null;
};

function mapEvent(row: PodiumEventRow): PodiumEvent {
  const entries = Array.isArray(row.top3) ? (row.top3 as PodiumEntryJson[]) : [];
  return {
    id: row.id,
    board: row.board,
    periodMonth: row.period_month,
    eventDate: row.event_date,
    top3: entries.map((entry) => ({
      userId: entry.user_id,
      username: entry.username ?? "user",
      displayName: entry.display_name ?? "Alguem",
      avatarUrl: entry.avatar_url,
      value: Number(entry.value ?? 0),
    })),
    sharedAt: row.shared_at,
    createdAt: row.created_at,
  };
}

export async function getPendingPodiumEvents(): Promise<PodiumEvent[]> {
  const { data, error } = await supabase.rpc("get_pending_podium_events");
  if (error) throw error;
  return ((data ?? []) as PodiumEventRow[]).map(mapEvent);
}

export async function getPodiumEvent(eventId: string): Promise<PodiumEvent | null> {
  const { data, error } = await supabase.rpc("get_podium_event", { p_event_id: eventId });
  if (error) throw error;
  const rows = (data ?? []) as PodiumEventRow[];
  return rows.length > 0 ? mapEvent(rows[0]) : null;
}

export async function markPodiumEventShared(eventId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_podium_event_shared", { p_event_id: eventId });
  if (error) throw error;
}
