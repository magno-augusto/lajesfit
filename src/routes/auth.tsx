import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const searchSchema = z.object({ mode: z.enum(["login", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/feed" });
  },
  head: () => ({ meta: [{ title: "Entrar - Lajes Fit" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">(mode ?? "login");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTab(mode ?? "login");
  }, [mode]);

  async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");
    const username = String(fd.get("username") || "").trim().toLowerCase();
    const displayName = String(fd.get("display_name") || "").trim();

    setLoading(true);
    try {
      if (tab === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              display_name: displayName || username || email.split("@")[0],
            },
          },
        });

        if (error) throw error;

        if (!data.session) {
          toast.error(
            "Conta criada, mas o Supabase ainda esta exigindo confirmacao de e-mail. Desative a confirmacao no painel Auth.",
          );
          setTab("login");
          return;
        }

        toast.success("Conta criada. Bem-vindo ao Lajes Fit!");
        navigate({ to: "/feed", replace: true });
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) throw new Error("Nao foi possivel iniciar a sessao.");

      toast.success("Login realizado.");
      navigate({ to: "/feed", replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha na autenticacao");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:block bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative h-full flex flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="" className="h-12 w-12 rounded-lg object-cover" />
            <span className="font-display text-3xl">LAJES FIT</span>
          </Link>
          <div>
            <h2 className="font-display text-5xl leading-none">A COMUNIDADE FITNESS DE LAJEDAO.</h2>
            <p className="mt-4 text-primary-foreground/80 max-w-md">
              Treinos, dieta, eventos e suor compartilhado.
            </p>
          </div>
          <p className="text-sm text-primary-foreground/60">Lajedao - Bahia</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <img src={logo} alt="" className="h-10 w-10 rounded-lg object-cover" />
            <span className="font-display text-2xl">LAJES FIT</span>
          </Link>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-4 mt-6">
              <form onSubmit={handleEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input id="login-email" name="email" type="email" placeholder="voce@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input id="login-password" name="password" type="password" placeholder="Sua senha" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="space-y-4 mt-6">
              <form onSubmit={handleEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Usuario</Label>
                  <Input
                    id="signup-username"
                    name="username"
                    placeholder="seu_usuario"
                    pattern="[a-zA-Z0-9_]+"
                    minLength={3}
                    maxLength={30}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-display-name">Nome</Label>
                  <Input id="signup-display-name" name="display_name" placeholder="Como voce quer aparecer" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input id="signup-email" name="email" type="email" placeholder="voce@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="Minimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
