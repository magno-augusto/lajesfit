import { createFileRoute } from "@tanstack/react-router";
import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BOARD_LABELS: Record<string, string> = {
  activities: "Atividades",
  workout_days: "Dias ativos",
  distance: "Distancia",
  calories: "Calorias queimadas",
  diet_days: "Refeicoes",
};

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

function configureVapid() {
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:contato@lajesfit.app";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

function buildPayload(
  type: string,
  actorName: string,
  actorUsername: string,
  board: string | null,
) {
  switch (type) {
    case "follow":
      return {
        title: "Novo seguidor",
        body: `${actorName} comecou a seguir voce`,
        url: `/profile/${actorUsername}`,
      };
    case "like":
      return {
        title: "Nova curtida",
        body: `${actorName} curtiu sua publicacao`,
        url: "/feed",
      };
    case "comment":
      return {
        title: "Novo comentario",
        body: `${actorName} comentou na sua publicacao`,
        url: "/feed",
      };
    case "challenge_dethroned": {
      const label = (board && BOARD_LABELS[board]) || "do mes";
      return {
        title: "Roubaram sua coroa!",
        body: `${actorName} roubou sua coroa no desafio ${label}`,
        url: "/desafio",
      };
    }
    default:
      return null;
  }
}

export const Route = createFileRoute("/api/push/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let notificationId: string | undefined;
        try {
          const body = (await request.json()) as { notificationId?: string };
          notificationId = body.notificationId;
        } catch {
          return json({ error: "JSON invalido" }, { status: 400 });
        }
        if (!notificationId) {
          return json({ error: "notificationId obrigatorio" }, { status: 400 });
        }

        if (!configureVapid()) {
          console.error("[Push] Chaves VAPID nao configuradas no ambiente");
          return json({ ok: false, error: "vapid_not_configured" }, { status: 500 });
        }

        // "claim" atomico via pushed_at: chamadas repetidas nao reenviam
        const { data: notification, error: claimError } = await supabaseAdmin
          .from("notifications")
          .update({ pushed_at: new Date().toISOString() })
          .eq("id", notificationId)
          .is("pushed_at", null)
          .select("id, user_id, actor_id, type, board")
          .maybeSingle();

        if (claimError) {
          console.error("[Push] Falha ao buscar notificacao", claimError);
          return json({ ok: false }, { status: 500 });
        }
        if (!notification) return json({ ok: true, skipped: "not_found_or_already_pushed" });

        const { data: actor } = await supabaseAdmin
          .from("profiles")
          .select("display_name, username")
          .eq("id", notification.actor_id)
          .maybeSingle();

        const payload = buildPayload(
          notification.type,
          actor?.display_name ?? "Alguem",
          actor?.username ?? "user",
          notification.board ?? null,
        );
        if (!payload) return json({ ok: true, skipped: "type_without_push" });

        const { data: subscriptions, error: subsError } = await supabaseAdmin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", notification.user_id);

        if (subsError) {
          console.error("[Push] Falha ao buscar inscricoes", subsError);
          return json({ ok: false }, { status: 500 });
        }
        if (!subscriptions || subscriptions.length === 0) {
          return json({ ok: true, sent: 0 });
        }

        const results = await Promise.allSettled(
          subscriptions.map((subscription) =>
            webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: { p256dh: subscription.p256dh, auth: subscription.auth },
              },
              JSON.stringify(payload),
            ),
          ),
        );

        // inscricoes mortas (dispositivo revogou/expirou) saem da tabela
        const goneIds = subscriptions
          .filter((_, index) => {
            const result = results[index];
            if (result.status !== "rejected") return false;
            const statusCode = (result.reason as { statusCode?: number })?.statusCode;
            return statusCode === 404 || statusCode === 410;
          })
          .map((subscription) => subscription.id);
        if (goneIds.length > 0) {
          await supabaseAdmin.from("push_subscriptions").delete().in("id", goneIds);
        }

        const sent = results.filter((result) => result.status === "fulfilled").length;
        return json({ ok: true, sent, removed: goneIds.length });
      },
    },
  },
});
