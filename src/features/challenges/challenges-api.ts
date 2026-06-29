import { supabase } from "@/integrations/supabase/client";

export type Challenge = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: "active" | "closed";
};

export type LeaderboardEntry = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  pctLoss: number;
  rank: number;
};

export type ActivityDaysEntry = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  activeDays: number;
  rank: number;
};

type ChallengeRow = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
};

function mapChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status as Challenge["status"],
  };
}

export async function ensureChallengeLifecycle(): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_challenge_lifecycle");
  if (error) throw error;
  return data as string;
}

export async function getActiveChallenge(): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from("challenges")
    .select("id, period_start, period_end, status")
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data ? mapChallenge(data) : null;
}

export async function getLastClosedChallenge(): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from("challenges")
    .select("id, period_start, period_end, status")
    .eq("status", "closed")
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapChallenge(data) : null;
}

export async function adminSetParticipantWeight(
  challengeId: string,
  userId: string,
  startWeightKg: number,
  endWeightKg: number | null,
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_participant_weight", {
    p_challenge_id: challengeId,
    p_user_id: userId,
    p_start_weight_kg: startWeightKg,
    p_end_weight_kg: endWeightKg,
  });
  if (error) throw error;
}

export async function getLeaderboard(challengeId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_challenge_leaderboard", {
    p_challenge_id: challengeId,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    pctLoss: row.pct_loss,
    rank: row.rank,
  }));
}

export async function getTopThree(challengeId: string): Promise<LeaderboardEntry[]> {
  const leaderboard = await getLeaderboard(challengeId);
  return leaderboard.slice(0, 3);
}

export async function getWorkoutDaysLeaderboard(): Promise<ActivityDaysEntry[]> {
  const { data, error } = await supabase.rpc("get_workout_days_leaderboard", { p_limit: 10 });
  if (error) throw error;
  return (data ?? []).map((row, index) => ({
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    activeDays: row.active_days,
    rank: index + 1,
  }));
}

export async function getDietDaysLeaderboard(): Promise<ActivityDaysEntry[]> {
  const { data, error } = await supabase.rpc("get_diet_days_leaderboard", { p_limit: 10 });
  if (error) throw error;
  return (data ?? []).map((row, index) => ({
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    activeDays: row.active_days,
    rank: index + 1,
  }));
}
