import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/features/auth/AuthPage";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar - Lajes Fit" }] }),
  component: AuthPage,
});
