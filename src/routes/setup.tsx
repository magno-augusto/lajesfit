import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { IdrSetup } from "@/components/idr-setup";
import { useLocalAuth } from "@/lib/local-auth";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Objetivo calorico - Lajes Fit" }] }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const { session, loading } = useLocalAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth", replace: true });
  }, [loading, navigate, session]);

  if (loading || !session) return <div className="min-h-screen bg-muted/40" />;

  return <IdrSetup />;
}
