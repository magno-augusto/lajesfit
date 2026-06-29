import { createFileRoute } from "@tanstack/react-router";
import { DiaryPage } from "@/features/diary/DiaryPage";

export const Route = createFileRoute("/_authenticated/diario")({
  head: () => ({ meta: [{ title: "Diario - Lajes Fit" }] }),
  component: DiaryPage,
});
