import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Apple, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lajes Fit - Rede social fitness de Lajedao" },
      {
        name: "description",
        content: "Compartilhe treinos, dietas e eventos de corrida com a comunidade fitness de Lajedao-BA.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Lajes Fit" className="h-10 w-10 rounded-lg object-cover" />
            <span className="font-display text-2xl">LAJES FIT</span>
          </Link>
          <div className="flex items-center gap-3">
            {authed ? (
              <Button asChild>
                <Link to="/feed">Abrir o app</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Criar conta
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.15),transparent_40%)]" />
        <div className="container relative mx-auto px-4 py-24 md:py-36">
          <div className="max-w-3xl">
            <p className="text-primary-foreground/80 font-medium uppercase tracking-widest text-sm">
              Lajedao - Bahia
            </p>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-primary-foreground mt-4 leading-none">
              SUE. COMA.
              <br />
              COMPARTILHE.
            </h1>
            <p className="text-primary-foreground/90 text-lg md:text-xl mt-6 max-w-2xl">
              A rede social fitness da galera de Lajedao. Poste treinos, conte calorias com a Tabela TACO
              e organize eventos de corrida.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button asChild size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Comecar gratis
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="border border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
              >
                <Link to="/auth">Ja tenho conta</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Activity, title: "Treinos", desc: "Registre corridas, bikes, trilhas e treinos manuais." },
            { icon: Apple, title: "Dieta com TACO", desc: "Conte calorias e macros usando alimentos da tabela brasileira." },
            { icon: Users, title: "Feed da galera", desc: "Publique, curta e acompanhe atletas da comunidade." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-card hover:shadow-glow transition-shadow">
              <div className="size-12 rounded-xl bg-gradient-primary grid place-items-center text-primary-foreground mb-4">
                <f.icon className="size-6" />
              </div>
              <h3 className="font-display text-2xl">{f.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        Lajes Fit - feito com suor em Lajedao-BA
      </footer>
    </div>
  );
}
