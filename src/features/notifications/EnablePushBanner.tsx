import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPushPermission, isPushSupported, subscribeToPush } from "./push-api";

const DISMISS_KEY = "lajesfit-push-banner-dismissed";

// Pede a permissao de notificacoes a partir de um gesto do usuario
// (navegadores bloqueiam prompts automaticos sem interacao)
export function EnablePushBanner({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (getPushPermission() !== "default") return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    setVisible(true);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const granted = await subscribeToPush(userId);
      if (granted) {
        toast.success("Notificacoes ativadas");
      } else {
        toast.error("Permissao negada. Voce pode ativar depois em Configuracoes.");
      }
      setVisible(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel ativar as notificacoes",
      );
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <BellRing className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Ative as notificacoes</p>
        <p className="text-xs text-muted-foreground">
          Saiba na hora quando curtirem, comentarem, te seguirem ou roubarem sua coroa.
        </p>
      </div>
      <Button size="sm" onClick={enable} disabled={busy}>
        {busy ? "Ativando..." : "Ativar"}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-8 shrink-0"
        onClick={dismiss}
        aria-label="Dispensar aviso de notificacoes"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
