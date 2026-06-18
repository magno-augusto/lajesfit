import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogIn, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithPassword, signUpWithPassword, useLocalAuth } from "@/lib/local-auth";
import { useLocalFitness } from "@/lib/local-fitness";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar - Lajes Fit" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useLocalAuth();
  const { idrProfile, loading: fitnessLoading } = useLocalFitness();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session || authLoading || fitnessLoading) return;
    navigate({ to: idrProfile ? "/feed" : "/setup", replace: true });
  }, [authLoading, fitnessLoading, idrProfile, navigate, session]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUpWithPassword(username, password);
        toast.success("Cadastro criado. Agora faca login.");
        setMode("login");
        setPassword("");
        return;
      }

      await loginWithPassword(username, password);
      toast.success("Sessao iniciada");
      navigate({ to: idrProfile ? "/feed" : "/setup", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel entrar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4 py-8">
      <section className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-card">
        <div className="mb-6 text-center">
          <img src={logo} alt="Lajes Fit" className="mx-auto h-14 w-14 rounded-lg object-cover" />
          <h1 className="mt-3 font-display text-4xl leading-none">LAJES FIT</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Entre para continuar" : "Crie seu cadastro"}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === "signup"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Cadastro
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="seu usuario"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="sua senha"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {mode === "login" ? (
              <>
                <LogIn className="size-4" /> {submitting ? "Entrando..." : "Entrar"}
              </>
            ) : (
              <>
                <UserPlus className="size-4" /> {submitting ? "Criando..." : "Criar cadastro"}
              </>
            )}
          </Button>
        </form>
      </section>
    </main>
  );
}
