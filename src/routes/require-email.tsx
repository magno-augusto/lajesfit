import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { RequireEmail } from "@/features/auth/RequireEmail";
import { useLocalAuth } from "@/features/auth/auth";

export const Route = createFileRoute("/require-email")({
  head: () => ({ meta: [{ title: "Cadastre seu e-mail - Lajes Fit" }] }),
  component: RequireEmailPage,
});

function RequireEmailPage() {
  const navigate = useNavigate();
  const { session, loading } = useLocalAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth", replace: true });
  }, [loading, navigate, session]);

  if (loading || !session) {
    return <div className="min-h-screen bg-muted/40" />;
  }

  return <RequireEmail />;
}
