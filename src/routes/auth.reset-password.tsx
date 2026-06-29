import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Nova senha - Lajes Fit" }] }),
  component: ResetPasswordPage,
});
