import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ensureStravaWebhookSubscription,
  exchangeStravaToken,
  fetchStravaActivities,
  getStravaConfig,
  getValidStravaAccessToken,
  upsertStravaActivities,
} from "@/features/workouts/strava.server";

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

export const syncStravaActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      afterDays: z.number().int().min(1).max(365).default(90),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: storedToken, error: tokenError } = await context.supabase
      .from("strava_tokens")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (tokenError) throw new Error(tokenError.message);
    if (!storedToken) throw new Error("Conecte sua conta Strava primeiro.");

    const accessToken = await getValidStravaAccessToken(context.supabase, storedToken);
    const activities = await fetchStravaActivities(accessToken, data.afterDays);
    const imported = await upsertStravaActivities(context.supabase, context.userId, activities);
    return { imported };
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
