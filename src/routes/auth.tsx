import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const searchSchema = z.object({ mode: z.enum(["login", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Entrar · Lajes Fit" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">(mode ?? "login");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/feed", replace: true });
    });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const displayName = String(fd.get("display_name") || "").trim();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}/feed`,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Bem-vindo ao Lajes Fit.");
        navigate({ to: "/feed", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/feed", replace: true });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/feed` });
    if (result.error) {
      toast.error(result.error.message ?? "Falha no login com Google");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/feed", replace: true });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:block bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative h-full flex flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="" className="h-12 w-12 rounded-lg" />
            <span className="font-display text-3xl">LAJES FIT</span>
          </Link>
          <div>
            <h2 className="font-display text-5xl leading-none">A COMUNIDADE FITNESS DE LAJEDÃO.</h2>
            <p className="mt-4 text-primary-foreground/80 max-w-md">Treinos, dieta, eventos e suor compartilhado.</p>
          </div>
          <p className="text-sm text-primary-foreground/60">Lajedão · Bahia</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <img src={logo} alt="" className="h-10 w-10 rounded-lg" />
            <span className="font-display text-2xl">LAJES FIT</span>
          </Link>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            {(["login", "signup"] as const).map((t) => (
              <TabsContent key={t} value={t} className="space-y-4 mt-6">
                <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
                  <svg className="size-4 mr-2" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6L19 3.7C17.1 1.9 14.7 1 12 1 7.7 1 4 3.5 2.2 7l3.3 2.6C6.4 7 9 5 12 5z"/><path fill="#4285F4" d="M23 12.2c0-.8-.1-1.6-.2-2.3H12v4.5h6.2c-.3 1.4-1.1 2.6-2.4 3.4l3.6 2.8c2.1-2 3.6-4.9 3.6-8.4z"/><path fill="#FBBC05" d="M5.5 14.4c-.2-.6-.4-1.3-.4-2 0-.7.1-1.4.4-2L2.2 7.8C1.4 9.1 1 10.5 1 12s.4 2.9 1.2 4.2l3.3-2.6z"/><path fill="#34A853" d="M12 23c2.7 0 5-.9 6.6-2.4l-3.6-2.8c-1 .7-2.3 1.1-3 1.1-3 0-5.6-2-6.5-4.6L2.2 16.2C4 19.6 7.7 23 12 23z"/></svg>
                  Continuar com Google
                </Button>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">ou com e-mail</span></div>
                </div>
                <form onSubmit={handleEmail} className="space-y-4">
                  {t === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Nome</Label>
                      <Input id="display_name" name="display_name" placeholder="Como você quer ser chamado" required maxLength={60} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" name="email" type="email" placeholder="voce@lajedao.ba" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {t === "signup" ? "Criar conta" : "Entrar"}
                  </Button>
                </form>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
