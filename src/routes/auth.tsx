import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/feed", replace: true });
    });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(fd.get("password") || "");
    const displayName = String(fd.get("display_name") || "").trim();

    setLoading(true);
    try {
      if (tab === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
          },
        });

        if (error) throw error;

        if (data.session) {
          toast.success("Conta criada! Bem-vindo ao Lajes Fit.");
          navigate({ to: "/feed", replace: true });
          return;
        }

        toast.success("Conta criada! Confira seu e-mail para confirmar o cadastro.");
        setTab("login");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) {
        throw new Error("Nao foi possivel iniciar a sessao. Verifique seu e-mail e senha.");
      }

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
            <img src={logo} alt="" className="h-12 w-12 rounded-lg" />
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
            <img src={logo} alt="" className="h-10 w-10 rounded-lg" />
            <span className="font-display text-2xl">LAJES FIT</span>
          </Link>
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "login" | "signup")}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            {(["login", "signup"] as const).map((t) => (
              <TabsContent key={t} value={t} className="space-y-4 mt-6">
                <form onSubmit={handleEmail} className="space-y-4">
                  {t === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor={`${t}-display-name`}>Nome</Label>
                      <Input
                        id={`${t}-display-name`}
                        name="display_name"
                        placeholder="Como voce quer ser chamado"
                        required
                        maxLength={60}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor={`${t}-email`}>E-mail</Label>
                    <Input
                      id={`${t}-email`}
                      name="email"
                      type="email"
                      placeholder="voce@lajedao.ba"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${t}-password`}>Senha</Label>
                    <Input
                      id={`${t}-password`}
                      name="password"
                      type="password"
                      placeholder="Minimo 6 caracteres"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Aguarde..." : t === "signup" ? "Criar conta" : "Entrar"}
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
