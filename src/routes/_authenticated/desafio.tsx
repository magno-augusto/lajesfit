import { createFileRoute } from "@tanstack/react-router";
import { ChallengePage } from "@/features/challenges/ChallengePage";

export const Route = createFileRoute("/_authenticated/desafio")({
  head: () => ({ meta: [{ title: "Desafio - Lajes Fit" }] }),
  component: ChallengePage,
});
