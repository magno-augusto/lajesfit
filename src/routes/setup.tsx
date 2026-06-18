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
  const { idrProfile, loading: fitnessLoading } = useLocalFitness();

  useEffect(() => {
    if (authLoading || fitnessLoading) return;
    if (!session) navigate({ to: "/auth", replace: true });
    if (session && idrProfile) navigate({ to: "/feed", replace: true });
  }, [authLoading, fitnessLoading, idrProfile, navigate, session]);

  if (authLoading || fitnessLoading || !session || idrProfile) {
    return <div className="min-h-screen bg-muted/40" />;
  }

  return <IdrSetup />;
}
