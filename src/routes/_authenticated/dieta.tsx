import { createFileRoute } from "@tanstack/react-router";
import { DiaryPage } from "@/features/diary/DiaryPage";

export const Route = createFileRoute("/_authenticated/dieta")({
  head: () => ({ meta: [{ title: "Dieta - Lajes Fit" }] }),
  component: DiaryPage,
});
