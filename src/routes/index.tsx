import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Camera,
  Flame,
  Footprints,
  Medal,
  Trophy,
  UserPlus,
} from "lucide-react";
import { useEffect } from "react";
import { useLocalAuth } from "@/features/auth/auth";
import { useFitness } from "@/features/fitness/useFitness";
import logoUrl from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LajesFit | Desafios, dieta e treinos em Lajedão" },
      {
        name: "description",
        content:
          "A comunidade fitness de Lajedão: participe dos desafios do mês, registre refeições e treinos e acompanhe calorias consumidas e queimadas. Grátis.",
      },
    ],
  }),
  component: HomeGate,
});

function HomeGate() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useLocalAuth();
  const { idrProfile, loading: fitnessLoading } = useFitness();

  useEffect(() => {
    if (authLoading || fitnessLoading) return;
    if (!session) return;
    navigate({ to: idrProfile ? "/feed" : "/setup", replace: true });
  }, [authLoading, fitnessLoading, idrProfile, navigate, session]);

  if (authLoading || fitnessLoading || session) {
    return <div className="min-h-screen bg-background" />;
  }

  return <LandingPage />;
}

function LandingPage() {
  const challengeSteps = [
    {
      icon: Trophy,
      title: "Entre no desafio do mês",
      text: "Metas simples de treino e dieta, valendo pontos no ranking da cidade.",
    },
    {
      icon: Activity,
      title: "Registre seu dia a dia",
      text: "Refeições com foto e treinos importados do Strava — sem planilha, sem complicação.",
    },
    {
      icon: Medal,
      title: "Acompanhe o placar",
      text: "Veja seu nome subir no ranking e dispute com os amigos até o fim do mês.",
    },
  ];

  const features = [
    { icon: Camera, label: "Fotos das refeições" },
    { icon: Flame, label: "Calorias consumidas e queimadas" },
    { icon: Footprints, label: "Sincroniza com o Strava" },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-6 pt-4 sm:max-w-lg">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="LajesFit" className="size-10 rounded-lg" />
            <span className="font-display text-3xl leading-none text-secondary">LAJESFIT</span>
          </div>
          <Link
            to="/auth"
            className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary"
          >
            Entrar
            <ArrowRight className="size-3.5" />
          </Link>
        </header>

        <div className="flex flex-1 flex-col justify-center py-8">
          <p className="mb-3 inline-flex w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            100% grátis · Feito em Lajedão
          </p>
          <h1 className="font-display text-6xl leading-[0.9] text-secondary">
            Desafios que fazem você voltar amanhã.
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            O LajesFit transforma treino e alimentação em um jogo com a galera da cidade: entre no
            desafio do mês, registre seu dia e acompanhe seu nome subir no ranking.
          </p>

          <div className="mt-6 grid gap-3">
            {challengeSteps.map((item) => (
              <article
                key={item.title}
                className="flex gap-3 rounded-lg border bg-card p-4 shadow-card"
              >
                <div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                  <item.icon className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">{item.title}</h2>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {features.map((feature) => (
              <div
                key={feature.label}
                className="rounded-lg border bg-muted/50 px-2 py-3 text-center text-xs font-semibold leading-4 text-foreground"
              >
                <feature.icon className="mx-auto mb-2 size-5 text-primary" />
                {feature.label}
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground shadow-glow"
          >
            <UserPlus className="size-4" />
            Criar conta grátis
          </Link>
          <a
            href="/lajesfit.apk"
            className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-semibold text-foreground"
          >
            Baixar o app para Android
          </a>
          <p className="mt-2 text-center text-xs text-muted-foreground">lajesfit.vercel.app</p>
        </div>
      </section>
    </main>
  );
}
