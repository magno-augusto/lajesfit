import { useNavigate } from "@tanstack/react-router";
import { LogIn, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loginWithGoogle,
  loginWithPassword,
  requestPasswordReset,
  signUpWithPassword,
  useLocalAuth,
} from "./auth";
import { getIdrProfile } from "@/features/goals/goals-api";
import { useFitness } from "@/features/fitness/useFitness";

export function AuthPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useLocalAuth();
  const { idrProfile, loading: fitnessLoading } = useFitness();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetUsername, setResetUsername] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    if (!session || authLoading || fitnessLoading) return;
    navigate({ to: idrProfile ? "/feed" : "/setup", replace: true });
  }, [authLoading, fitnessLoading, idrProfile, navigate, session]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUpWithPassword(username, password, email);
        toast.success("Cadastro criado. Agora faca login.");
        setMode("login");
        setPassword("");
        return;
      }

      await loginWithPassword(username, password);
      const savedProfile = await getIdrProfile();
      toast.success("Sessao iniciada");
      navigate({ to: savedProfile ? "/feed" : "/setup", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel entrar");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setResetSubmitting(true);
    try {
      await requestPasswordReset(resetUsername);
      toast.success("Enviamos um link de redefinicao de senha para o e-mail cadastrado.");
      setResetOpen(false);
      setResetUsername("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel enviar o link");
    } finally {
      setResetSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel entrar com Google");
      setGoogleSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4 py-8">
      <section className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-card">
        <div className="mb-6 text-center">
          <h1 className="font-display text-4xl leading-none">LAJES FIT</h1>
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

        <div className="mb-5 space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={googleSubmitting || submitting}
          >
            <span className="grid size-5 place-items-center rounded-full border bg-background text-xs font-semibold text-foreground">
              G
            </span>
            {googleSubmitting ? "Abrindo Google..." : "Continuar com Google"}
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{mode === "signup" ? "Usuario" : "Usuario ou e-mail"}</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={mode === "signup" ? "seu usuario" : "seu usuario ou e-mail"}
              required
            />
          </div>

          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="signup-email">E-mail</Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Usado para recuperar sua senha caso voce a esqueca.
              </p>
            </div>
          )}

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

          {mode === "login" && (
            <Dialog open={resetOpen} onOpenChange={setResetOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="-mt-1 block text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Recuperar senha</DialogTitle>
                </DialogHeader>
                <form onSubmit={submitPasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-username">Usuario</Label>
                    <Input
                      id="reset-username"
                      autoComplete="username"
                      value={resetUsername}
                      onChange={(event) => setResetUsername(event.target.value)}
                      placeholder="seu usuario"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enviaremos um link de redefinicao de senha para o e-mail cadastrado nessa
                    conta.
                  </p>
                  <Button type="submit" className="w-full" disabled={resetSubmitting}>
                    {resetSubmitting ? "Enviando..." : "Enviar link"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

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
