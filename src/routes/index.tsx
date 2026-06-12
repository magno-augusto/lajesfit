import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Activity, Apple, Calendar, Users } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lajes Fit — Rede social fitness de Lajedão" },
      { name: "description", content: "Compartilhe treinos, dietas e eventos de corrida com a comunidade fitness de Lajedão-BA. Integração com Strava e Tabela TACO." },
      { property: "og:title", content: "Lajes Fit — Rede social fitness" },
      { property: "og:description", content: "Treinos, dieta e corridas em comunidade. Conecte seu Strava e acompanhe suas calorias com a Tabela TACO." },
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
              <Button asChild variant="default"><Link to="/feed">Abrir o app</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost"><Link to="/auth">Entrar</Link></Button>
                <Button asChild><Link to="/auth" search={{ mode: "signup" }}>Criar conta</Link></Button>
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
            <p className="text-primary-foreground/80 font-medium uppercase tracking-widest text-sm">Lajedão · Bahia</p>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-primary-foreground mt-4 leading-none">
              SUE. COMA. <br/> COMPARTILHE.
            </h1>
            <p className="text-primary-foreground/90 text-lg md:text-xl mt-6 max-w-2xl">
              A rede social fitness da galera de Lajedão. Poste treinos, importe corridas do Strava, conte calorias com a Tabela TACO e organize eventos de corrida.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button asChild size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90">
                <Link to="/auth" search={{ mode: "signup" }}>Começar grátis</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/auth">Já tenho conta</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Activity, title: "Treinos & Strava", desc: "Importe corridas, bikes e trilhas direto do Strava ou registre manualmente." },
            { icon: Apple, title: "Dieta com TACO", desc: "Conte calorias e macros usando a tabela oficial da nutrição brasileira." },
            { icon: Users, title: "Feed da galera", desc: "Curta, comente e siga atletas da comunidade. Foto, vídeo e PR." },
            { icon: Calendar, title: "Eventos de corrida", desc: "Crie ou participe de provas, treinões e desafios em Lajedão e região." },
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
        Lajes Fit · feito com suor em Lajedão-BA
      </footer>
    </div>
  );
}
