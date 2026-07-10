import { createFileRoute, Link } from "@tanstack/react-router";
import { LogIn, UserPlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useLocalAuth } from "@/features/auth/auth";
import { ChallengePage } from "@/features/challenges/ChallengePage";
import logoUrl from "@/assets/logo.png";

export const Route = createFileRoute("/desafio")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    // deep link do push de podio: abre o dialog de compartilhamento do evento
    podio: typeof search.podio === "string" ? search.podio : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Desafios do mês - Lajes Fit" },
      {
        name: "description",
        content:
          "Acompanhe os rankings do desafio do mês no LajesFit: dias ativos, distância, calorias queimadas, peso perdido e refeições registradas.",
      },
    ],
  }),
  component: DesafioGate,
});

// Pagina publica: visitante ve os rankings com CTA de cadastro;
// usuario logado mantem o shell normal do app (header + nav)
function DesafioGate() {
  const { session, loading } = useLocalAuth();
  const { podio } = Route.useSearch();

  if (loading) return <div className="min-h-screen bg-muted/40" />;

  if (session) {
    return (
      <AppShell>
        <ChallengePage podiumEventId={podio} />
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="fixed inset-x-0 top-0 z-30 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-3">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2">
            <img src={logoUrl} alt="LajesFit" className="size-8 shrink-0 rounded-md sm:size-9" />
            <span className="whitespace-nowrap font-display text-xl leading-none text-secondary sm:text-2xl">
              lajesfit
            </span>
          </Link>
          <Link
            to="/auth"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary"
          >
            Entrar
            <LogIn className="size-3.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-36 pt-17">
        <ChallengePage />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground shadow-glow"
          >
            <UserPlus className="size-4" />
            Participar
          </Link>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            Crie sua conta grátis e entre no desafio do mês.
          </p>
        </div>
      </div>
    </div>
  );
}
