import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { importStravaActivityForAthlete } from "@/lib/strava.server";

type StravaWebhookEvent = {
  aspect_type?: string;
  event_time?: number;
  object_id?: number;
  object_type?: string;
  owner_id?: number;
  subscription_id?: number;
  updates?: Record<string, string>;
};

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

function getVerifyToken() {
  return process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
}

export const Route = createFileRoute("/api/strava/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const challenge = url.searchParams.get("hub.challenge");
        const verifyToken = url.searchParams.get("hub.verify_token");
        const expectedToken = getVerifyToken();

        if (!expectedToken) {
          return json({ error: "STRAVA_WEBHOOK_VERIFY_TOKEN nao configurado" }, { status: 500 });
        }

        if (mode !== "subscribe" || !challenge || verifyToken !== expectedToken) {
          return json({ error: "Webhook Strava invalido" }, { status: 403 });
        }

        return json({ "hub.challenge": challenge });
      },
      POST: async ({ request }) => {
        let event: StravaWebhookEvent;

        try {
          event = (await request.json()) as StravaWebhookEvent;
        } catch {
          return json({ error: "JSON invalido" }, { status: 400 });
        }

        if (!event.owner_id || !event.object_id || !event.object_type || !event.aspect_type) {
          return json({ error: "Evento Strava incompleto" }, { status: 400 });
        }

        const receivedAt = new Date().toISOString();
        const { data: storedEvent, error: insertError } = await supabaseAdmin
          .from("strava_webhook_events")
          .upsert(
            {
              subscription_id: event.subscription_id ?? null,
              owner_id: event.owner_id,
              object_id: event.object_id,
              object_type: event.object_type,
              aspect_type: event.aspect_type,
              event_time: event.event_time ?? null,
              updates: event.updates ?? {},
              status: "received",
              error_message: null,
            },
            {
              onConflict: "subscription_id,owner_id,object_id,object_type,aspect_type,event_time",
              ignoreDuplicates: false,
            },
          )
          .select("id")
          .single();

        if (insertError) {
          console.error("[Strava webhook] Nao foi possivel registrar evento", insertError);
          return json({ ok: true, warning: "event_not_logged" });
        }

        if (event.object_type !== "activity" || event.aspect_type !== "create") {
          await supabaseAdmin
            .from("strava_webhook_events")
            .update({ status: "ignored", processed_at: receivedAt })
            .eq("id", storedEvent.id);

          return json({ ok: true, ignored: true });
        }

        try {
          const result = await importStravaActivityForAthlete(supabaseAdmin, event.owner_id, event.object_id);

          await supabaseAdmin
            .from("strava_webhook_events")
            .update({
              status: result.imported > 0 ? "imported" : "skipped",
              error_message: result.skipped,
              processed_at: new Date().toISOString(),
            })
            .eq("id", storedEvent.id);

          return json({ ok: true, ...result });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro desconhecido";
          console.error("[Strava webhook] Falha ao importar atividade", error);

          await supabaseAdmin
            .from("strava_webhook_events")
            .update({
              status: "failed",
              error_message: message,
              processed_at: new Date().toISOString(),
            })
            .eq("id", storedEvent.id);

          return json({ ok: true, imported: 0, error: message });
        }
      },
    },
  },
});
