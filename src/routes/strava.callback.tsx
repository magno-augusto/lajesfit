import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { exchangeStravaCode } from "@/features/workouts/strava-api";

export const Route = createFileRoute("/strava/callback")({
  component: StravaCallbackPage,
});

function StravaCallbackPage() {
  const search = Route.useSearch() as {
    code?: string;
    scope?: string;
    state?: string;
    error?: string;
  };
  const navigate = useNavigate();
  const [message, setMessage] = useState("Conectando ao Strava...");

  useEffect(() => {
    async function finishConnection() {
      if (search.error) {
        setMessage("Autorizacao cancelada.");
        toast.error("Autorizacao do Strava cancelada");
        navigate({ to: "/diario", replace: true });
        return;
      }

      const expectedState = sessionStorage.getItem("lajesfit-strava-oauth-state");
      sessionStorage.removeItem("lajesfit-strava-oauth-state");

      if (!search.code || !search.state || search.state !== expectedState) {
        setMessage("Nao foi possivel validar o retorno do Strava.");
        toast.error("Retorno do Strava invalido");
        navigate({ to: "/diario", replace: true });
        return;
      }

      try {
        await exchangeStravaCode({ data: { code: search.code, scope: search.scope } });
        toast.success("Strava conectado");
        navigate({ to: "/diario", replace: true });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Nao foi possivel conectar ao Strava");
        toast.error(error instanceof Error ? error.message : "Nao foi possivel conectar ao Strava");
      }
    }

    void finishConnection();
  }, [navigate, search.code, search.error, search.scope, search.state]);

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4">
      <div className="rounded-lg border bg-card px-6 py-5 text-center text-sm text-muted-foreground shadow-card">
        {message}
      </div>
    </main>
  );
}
