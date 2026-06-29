import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { describeEmailUpdateError, logout } from "./auth";
import logo from "@/assets/logo.png";

export function RequireEmail() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleLogout() {
    await logout();
    navigate({ to: "/auth", replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.updateUser(
        { email: cleanEmail },
        { emailRedirectTo: `${window.location.origin}/feed` },
      );
      if (error) throw new Error(describeEmailUpdateError(error));
      setSentTo(cleanEmail);
      toast.success("Enviamos um link de confirmacao para o seu e-mail");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar o e-mail");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4">
      <section className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-card">
        <div className="mb-6 text-center">
          <img src={logo} alt="Lajes Fit" className="mx-auto h-14 w-14 rounded-lg object-cover" />
          <h1 className="mt-3 font-display text-3xl leading-none">CADASTRE SEU E-MAIL</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua conta ainda nao tem um e-mail real. Cadastre um para conseguir recuperar sua senha
            caso a esqueca.
          </p>
        </div>

        {sentTo ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Enviamos um link de confirmacao para <strong>{sentTo}</strong>. Clique no link para
              concluir.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate({ to: "/feed", replace: true })}
            >
              Continuar por agora
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="require-email">E-mail</Label>
              <Input
                id="require-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Enviando..." : "Salvar e-mail"}
            </Button>
          </form>
        )}

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mt-4 block w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Sair da conta
        </button>
      </section>
    </main>
  );
}
