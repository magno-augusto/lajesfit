import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";
const STRAVA_ACTIVITY_URL = "https://www.strava.com/api/v3/activities";

export type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
  athlete?: { id?: number };
};

export type StravaActivity = {
  id: number;
  name: string;
  type?: string;
  sport_type?: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  start_date?: string;
  start_date_local?: string;
  calories?: number;
};

type Supabase = SupabaseClient<Database>;

export function getStravaConfig() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Configure STRAVA_CLIENT_ID e STRAVA_CLIENT_SECRET no ambiente do servidor.");
  }

  return { clientId, clientSecret };
}

export async function exchangeStravaToken(params: Record<string, string>) {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });

  if (!response.ok) {
    let details = "";
    try {
      const body = (await response.json()) as { message?: string; errors?: unknown };
      details = body.message ?? JSON.stringify(body.errors ?? body) ?? "";
    } catch {
      try {
        details = await response.text();
      } catch {
        details = "";
      }
    }

    console.error("[Strava] Token exchange failed", {
      status: response.status,
      details: details.slice(0, 500),
    });

    const suffix = details ? `: ${details}` : "";
    throw new Error(`Nao foi possivel autenticar com o Strava (${response.status})${suffix}`);
  }

  return (await response.json()) as StravaTokenResponse;
}

export function mapStravaActivity(activity: StravaActivity, userId: string) {
  return {
    user_id: userId,
    source: "strava",
    strava_activity_id: activity.id,
    activity_type: activity.sport_type ?? activity.type ?? "Activity",
    title: activity.name ?? "Atividade Strava",
    distance_meters: Math.round(activity.distance ?? 0) || null,
    duration_seconds: activity.moving_time ?? activity.elapsed_time ?? null,
    calories:
      typeof activity.calories === "number" && activity.calories > 0
        ? Math.round(activity.calories)
        : null,
    performed_at: activity.start_date_local ?? activity.start_date ?? new Date().toISOString(),
  };
}

export async function getValidStravaAccessToken(
  supabase: Supabase,
  token: Database["public"]["Tables"]["strava_tokens"]["Row"],
) {
  let accessToken = token.access_token;

  if (token.expires_at > Math.floor(Date.now() / 1000) + 300) {
    return accessToken;
  }

  const { clientId, clientSecret } = getStravaConfig();
  const refreshed = await exchangeStravaToken({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
  });

  accessToken = refreshed.access_token;

  const { error } = await supabase.from("strava_tokens").upsert({
    user_id: token.user_id,
    athlete_id: refreshed.athlete?.id ?? token.athlete_id,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: refreshed.expires_at,
    scope: refreshed.scope ?? token.scope,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  return accessToken;
}

export async function fetchStravaActivities(accessToken: string, afterDays: number) {
  const after = Math.floor((Date.now() - afterDays * 24 * 60 * 60 * 1000) / 1000);
  const params = new URLSearchParams({
    after: String(after),
    per_page: "50",
    page: "1",
  });
  const response = await fetch(`${STRAVA_ACTIVITIES_URL}?${params}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error("[Strava] Activities fetch failed", { status: response.status });
    throw new Error(`Nao foi possivel buscar atividades no Strava (${response.status})`);
  }
  return (await response.json()) as StravaActivity[];
}

export async function fetchStravaActivity(accessToken: string, activityId: number) {
  const response = await fetch(`${STRAVA_ACTIVITY_URL}/${activityId}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error("[Strava] Activity fetch failed", { status: response.status, activityId });
    throw new Error(`Nao foi possivel buscar a atividade no Strava (${response.status})`);
  }
  return (await response.json()) as StravaActivity;
}

export async function upsertStravaActivities(
  supabase: Supabase,
  userId: string,
  activities: StravaActivity[],
) {
  const rows = activities.map((activity) => mapStravaActivity(activity, userId));

  if (rows.length === 0) return 0;

  const { error } = await supabase
    .from("workouts")
    .upsert(rows, { onConflict: "user_id,strava_activity_id", ignoreDuplicates: false });

  if (error) throw new Error(error.message);
  return rows.length;
}

export async function importStravaActivityForAthlete(
  supabase: Supabase,
  athleteId: number,
  activityId: number,
) {
  const { data: token, error } = await supabase
    .from("strava_tokens")
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!token) return { imported: 0, skipped: "athlete_not_connected" };

  const accessToken = await getValidStravaAccessToken(supabase, token);
  const activity = await fetchStravaActivity(accessToken, activityId);
  const imported = await upsertStravaActivities(supabase, token.user_id, [activity]);

  return { imported, skipped: null };
}
