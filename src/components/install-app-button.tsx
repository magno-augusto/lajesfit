import { useEffect, useState } from "react";
import { Download, MoreVertical, Share, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;

  const standaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
  const navigatorStandalone =
    "standalone" in window.navigator && Boolean(window.navigator.standalone);
  return standaloneMedia || navigatorStandalone;
}

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function getPlatform() {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

export function InstallAppButton({
  compact = false,
  className = "",
  menuItem = false,
}: {
  compact?: boolean;
  className?: string;
  menuItem?: boolean;
}) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");

  useEffect(() => {
    function updateVisibility() {
      const mobile = isMobileDevice();
      const installed = isStandalone();
      setVisible(mobile && !installed);
      setPlatform(getPlatform());
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      updateVisibility();
    }

    function handleInstalled() {
      setPromptEvent(null);
      setVisible(false);
      setHelpOpen(false);
      toast.success("App instalado");
    }

    updateVisibility();
    window.addEventListener("resize", updateVisibility);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("resize", updateVisibility);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!visible) return null;

  async function install() {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setPromptEvent(null);
      if (choice.outcome === "accepted") {
        setVisible(false);
        setHelpOpen(false);
      } else {
        setHelpOpen(true);
      }
      return;
    }

    setHelpOpen(true);
  }

  const isIos = platform === "ios";

  const trigger = menuItem ? (
    <DropdownMenuItem
      onSelect={(event) => {
        event.preventDefault();
        void install();
      }}
    >
      <Download className="mr-2 size-4" />
      Baixar
    </DropdownMenuItem>
  ) : (
    <Button
      type="button"
      onClick={install}
      size="sm"
      variant="secondary"
      className={
        compact
          ? `h-9 rounded-full px-3 text-xs leading-none shadow-sm md:hidden ${className}`
          : `h-7 rounded-full px-2.5 text-[11px] leading-none shadow-sm md:hidden ${className}`
      }
    >
      <Download className={compact ? "size-4" : "size-3.5"} />
      {compact ? "Baixar" : "Instalar app"}
    </Button>
  );

  return (
    <>
      {trigger}

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle>Adicionar à tela inicial</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
              <Smartphone className="mt-0.5 size-5 text-primary" />
              <p>
                O Lajes Fit pode abrir como app no celular, sem precisar digitar o endereço no
                navegador.
              </p>
            </div>

            {isIos ? (
              <ol className="space-y-3">
                <li className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    1
                  </span>
                  <span>
                    No Safari, toque no botão <Share className="inline size-4" /> Compartilhar.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    2
                  </span>
                  <span>Escolha “Adicionar à Tela de Início”.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    3
                  </span>
                  <span>Confirme em “Adicionar”.</span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3">
                <li className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    1
                  </span>
                  <span>
                    No Chrome, toque no menu <MoreVertical className="inline size-4" />.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    2
                  </span>
                  <span>Escolha “Instalar app” ou “Adicionar à tela inicial”.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    3
                  </span>
                  <span>Confirme a instalação.</span>
                </li>
              </ol>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
