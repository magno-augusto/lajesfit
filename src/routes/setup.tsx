import { createFileRoute } from "@tanstack/react-router";
import { IdrSetup } from "@/components/idr-setup";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Calcular IDR - Lajes Fit" }] }),
  component: IdrSetup,
});
