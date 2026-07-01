import { createFileRoute } from "@tanstack/react-router";
import { WorkoutsPage } from "@/features/workouts/WorkoutsPage";

export const Route = createFileRoute("/_authenticated/treinos")({
  head: () => ({ meta: [{ title: "Treinos - Lajes Fit" }] }),
  component: WorkoutsPage,
});
