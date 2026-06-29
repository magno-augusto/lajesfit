import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/supabase-user";

export type Challenge = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: "active" | "closed";
};

export type ChallengeParticipant = {
  id: string;
  challengeId: string;
  userId: string;
  startWeightKg: number;
  endWeightKg: number | null;
};

export type LeaderboardEntry = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  pctLoss: number;
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

export async function getMyParticipation(challengeId: string): Promise<ChallengeParticipant | null> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("challenge_participants")
    .select("id, challenge_id, user_id, start_weight_kg, end_weight_kg")
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    challengeId: data.challenge_id,
    userId: data.user_id,
    startWeightKg: data.start_weight_kg,
    endWeightKg: data.end_weight_kg,
  };
}

export async function joinChallenge(challengeId: string, startWeightKg: number): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from("challenge_participants")
    .insert({ challenge_id: challengeId, user_id: userId, start_weight_kg: startWeightKg });
  if (error) throw error;
}

export async function logFinalWeight(participantId: string, endWeightKg: number): Promise<void> {
  const { error } = await supabase
    .from("challenge_participants")
    .update({ end_weight_kg: endWeightKg })
    .eq("id", participantId);
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
