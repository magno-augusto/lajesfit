import { createFileRoute } from "@tanstack/react-router";
import { SearchPage } from "@/features/profile/SearchPage";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Buscar - Lajes Fit" }] }),
  component: SearchPage,
});
