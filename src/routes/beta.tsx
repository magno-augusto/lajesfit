import { createFileRoute } from "@tanstack/react-router";
import { Mail, Smartphone, Users } from "lucide-react";
import logoUrl from "@/assets/logo.png";

const GOOGLE_GROUP_JOIN_URL = "https://groups.google.com/g/lajesfit-beta";

export const Route = createFileRoute("/beta")({
  head: () => ({
    meta: [
      { title: "Testar o LajesFit no Android - Beta" },
      {
        name: "description",
        content:
          "Entre no grupo de testadores do LajesFit e instale a versão nativa Android antes de todo mundo.",
      },
    ],
  }),
  component: BetaPage,
});

function BetaPage() {
  const steps = [
    {
      icon: Users,
      title: "Entre no grupo de testadores",
      text: "Clique no botão abaixo e entre no grupo do Google — é rápido e gratuito.",
    },
    {
      icon: Mail,
      title: "Confira seu e-mail",
      text: "O Google manda uma mensagem de boas-vindas com o link para virar testador oficial.",
    },
    {
      icon: Smartphone,
      title: "Instale pela Play Store",
      text: 'Abra o link, toque em "Torne-se testador" e instale o LajesFit normalmente pela loja.',
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-6 pt-4 sm:max-w-lg">
        <header className="flex items-center gap-2">
          <img src={logoUrl} alt="LajesFit" className="size-10 rounded-lg" />
          <span className="font-display text-3xl leading-none text-secondary">LAJESFIT</span>
        </header>

        <div className="flex flex-1 flex-col justify-center py-8">
          <p className="mb-3 inline-flex w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            Teste fechado · Android
          </p>
          <h1 className="font-display text-5xl leading-[0.95] text-secondary">
            Teste o LajesFit no Android antes de todo mundo.
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Estamos testando a versão nativa Android com um grupo pequeno de usuários antes de
            lançar para todo mundo. Funciona em aparelhos com Android 8.0 ou mais recente.
          </p>

          <div className="mt-6 grid gap-3">
            {steps.map((item, index) => (
              <article
                key={item.title}
                className="flex gap-3 rounded-lg border bg-card p-4 shadow-card"
              >
                <div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                  <item.icon className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    {index + 1}. {item.title}
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.text}</p>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            Seu e-mail fica visível só para os administradores do grupo, nunca para outros
            testadores.
          </p>
        </div>

        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <a
            href={GOOGLE_GROUP_JOIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground shadow-glow"
          >
            <Users className="size-4" />
            Entrar no grupo de testadores
          </a>
          <p className="mt-2 text-center text-xs text-muted-foreground">lajesfit.vercel.app/beta</p>
        </div>
      </section>
    </main>
  );
}
