import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { disconnectStravaForUser } from "@/features/workouts/strava.server";

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

// Chamado pelo app Android (Bearer token da sessao supabase-kt, sem cookies) ao conectar o
// Health Connect, para desconectar o Strava e liberar a vaga de conexao com a API deles
// (ver strava_tokens/getStravaConfig — o client_secret so existe aqui no servidor).
export const Route = createFileRoute("/api/strava/disconnect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return json({ error: "Token de autenticacao ausente" }, { status: 401 });
        }

        const token = authHeader.replace("Bearer ", "");
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY =
          process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return json({ error: "Supabase nao configurado no servidor" }, { status: 500 });
        }

        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });

        const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
        if (claimsError || !claimsData?.claims?.sub) {
          return json({ error: "Token invalido" }, { status: 401 });
        }

        try {
          const result = await disconnectStravaForUser(supabase, claimsData.claims.sub);
          return json(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro desconhecido";
          return json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
