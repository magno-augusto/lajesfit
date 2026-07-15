import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  deleteWorkoutsBeforeStravaConnection,
  disconnectStravaForUser,
  ensureStravaWebhookSubscription,
  exchangeStravaToken,
  fetchStravaActivities,
  fetchStravaActivity,
  getStravaConfig,
  getValidStravaAccessToken,
  listStravaPushSubscriptions,
  stravaConnectionCutoffSeconds,
  upsertStravaActivities,
} from "@/features/workouts/strava.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";

function assertRedirectUri(redirectUri: string) {
  const url = new URL(redirectUri);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Redirect URI invalida");
  }
  return url.toString();
}

export const getStravaAuthorizationUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      redirectUri: z.string().url(),
      state: z.string().min(16),
    }),
  )
  .handler(async ({ data }) => {
    const { clientId } = getStravaConfig();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: assertRedirectUri(data.redirectUri),
      response_type: "code",
      approval_prompt: "auto",
      scope: "read,activity:read",
      state: data.state,
    });

    return { url: `${STRAVA_AUTHORIZE_URL}?${params}` };
  });

export const exchangeStravaCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      code: z.string().min(1),
      scope: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { clientId, clientSecret } = getStravaConfig();
    const token = await exchangeStravaToken({
      client_id: clientId,
      client_secret: clientSecret,
      code: data.code,
      grant_type: "authorization_code",
    });

    const grantedScope = data.scope ?? token.scope ?? "";
    if (!grantedScope.split(/[,\s]+/).includes("activity:read")) {
      throw new Error("Autorize o escopo activity:read para importar atividades.");
    }

    const { error } = await context.supabase.from("strava_tokens").upsert({
      user_id: context.userId,
      athlete_id: token.athlete?.id ?? null,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      scope: grantedScope,
      updated_at: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);
    return { connected: true };
  });

export const getStravaConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("strava_tokens")
      .select("athlete_id, scope, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return {
      connected: Boolean(data),
      athleteId: data?.athlete_id ?? null,
      scope: data?.scope ?? null,
    };
  });

export const disconnectStrava = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { disconnected } = await disconnectStravaForUser(context.supabase, context.userId);
    return { disconnected };
  });

export const syncStravaActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storedToken, error: tokenError } = await context.supabase
      .from("strava_tokens")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (tokenError) throw new Error(tokenError.message);
    if (!storedToken) throw new Error("Conecte sua conta Strava primeiro.");

    const removed = await deleteWorkoutsBeforeStravaConnection(
      context.supabase,
      context.userId,
      storedToken.created_at,
    );

    const accessToken = await getValidStravaAccessToken(context.supabase, storedToken);
    const after = stravaConnectionCutoffSeconds(storedToken.created_at);
    const activities = await fetchStravaActivities(accessToken, after);

    // O endpoint de lista não retorna calorias. Para economizar requisições ao
    // Strava, só buscamos o detalhe de atividades novas ou ainda sem calorias no
    // banco; as demais reaproveitam a caloria já salva (preservada no upsert).
    const { data: existingRows, error: existingError } = await context.supabase
      .from("workouts")
      .select("strava_activity_id, calories")
      .eq("user_id", context.userId)
      .not("strava_activity_id", "is", null);
    if (existingError) throw new Error(existingError.message);

    const idsWithCalories = new Set(
      (existingRows ?? [])
        .filter((row) => typeof row.calories === "number" && row.calories > 0)
        .map((row) => row.strava_activity_id),
    );

    const activitiesWithCalories = await Promise.all(
      activities.map(async (activity) => {
        if (typeof activity.calories === "number" && activity.calories > 0) return activity;
        if (idsWithCalories.has(activity.id)) return activity;
        try {
          return await fetchStravaActivity(accessToken, activity.id);
        } catch {
          return activity;
        }
      }),
    );

    const imported = await upsertStravaActivities(
      context.supabase,
      context.userId,
      activitiesWithCalories,
    );
    return { imported, removed };
  });

export const getStravaWebhookStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", context.userId)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profile?.is_admin) throw new Error("Apenas administradores podem ver o webhook.");

    const appUrl = process.env.VITE_APP_URL;
    const callbackUrl = appUrl ? `${appUrl.replace(/\/$/, "")}/api/strava/webhook` : null;
    const subscriptions = await listStravaPushSubscriptions();
    const active = callbackUrl
      ? subscriptions.some((subscription) => subscription.callback_url === callbackUrl)
      : subscriptions.length > 0;

    // a tabela de eventos so e' acessivel via service role (RLS sem policies)
    const { data: lastEvent, error: eventError } = await supabaseAdmin
      .from("strava_webhook_events")
      .select("created_at, status")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eventError) throw new Error(eventError.message);

    return {
      active,
      lastEventAt: lastEvent?.created_at ?? null,
      lastEventStatus: lastEvent?.status ?? null,
    };
  });

export const setupStravaWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", context.userId)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profile?.is_admin) throw new Error("Apenas administradores podem configurar o webhook.");

    const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
    const appUrl = process.env.VITE_APP_URL;
    if (!verifyToken || !appUrl) {
      throw new Error(
        "Configure STRAVA_WEBHOOK_VERIFY_TOKEN e VITE_APP_URL no ambiente do servidor.",
      );
    }

    const callbackUrl = `${appUrl.replace(/\/$/, "")}/api/strava/webhook`;
    return ensureStravaWebhookSubscription(callbackUrl, verifyToken);
  });
