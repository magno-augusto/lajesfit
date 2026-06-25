import { createFileRoute } from "@tanstack/react-router";
import { DietPage } from "@/features/diet/DietPage";

export const Route = createFileRoute("/_authenticated/diet")({
  head: () => ({ meta: [{ title: "Dieta - Lajes Fit" }] }),
  component: DietPage,
});
