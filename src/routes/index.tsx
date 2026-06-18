import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLocalAuth } from "@/lib/local-auth";
import { useLocalFitness } from "@/lib/local-fitness";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Lajes Fit" }] }),
  component: HomeGate,
});

function HomeGate() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useLocalAuth();
  const { idrProfile, loading: fitnessLoading } = useLocalFitness();

  useEffect(() => {
    if (authLoading || fitnessLoading) return;
    navigate({ to: !session ? "/auth" : idrProfile ? "/feed" : "/setup", replace: true });
  }, [authLoading, fitnessLoading, idrProfile, navigate, session]);

  return <div className="min-h-screen bg-background" />;
}
