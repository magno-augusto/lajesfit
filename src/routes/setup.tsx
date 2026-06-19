import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { IdrSetup } from "@/components/idr-setup";
import { useLocalAuth } from "@/lib/local-auth";
import { useLocalFitness } from "@/lib/local-fitness";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Objetivo calorico - Lajes Fit" }] }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useLocalAuth();
  const { idrProfile, loading: fitnessLoading, error } = useLocalFitness();

  useEffect(() => {
    if (authLoading || fitnessLoading) return;
    if (!session) navigate({ to: "/auth", replace: true });
    if (session && idrProfile) navigate({ to: "/feed", replace: true });
  }, [authLoading, fitnessLoading, idrProfile, navigate, session]);

  if (authLoading || fitnessLoading || !session || idrProfile) {
    return <div className="min-h-screen bg-muted/40" />;
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/40 px-4">
        <section className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-card">
          <h1 className="font-display text-3xl leading-none">LAJES FIT</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            Se voce administra o app, confirme as variaveis de ambiente e aplique as migrations do
            Supabase.
          </p>
        </section>
      </main>
    );
  }

  return <IdrSetup />;
}
