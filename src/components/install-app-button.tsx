import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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

function isIosDevice() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      const mobile = isMobileDevice();
      const installed = isStandalone();
      setVisible(mobile && !installed);
      setShowIosHelp(mobile && !installed && isIosDevice());
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      updateVisibility();
    }

    function handleInstalled() {
      setPromptEvent(null);
      setVisible(false);
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

  if (!visible || (!promptEvent && !showIosHelp)) return null;

  async function install() {
    if (showIosHelp && !promptEvent) {
      toast.info("No iPhone: toque em Compartilhar e depois em Adicionar a Tela de Inicio.");
      return;
    }

    if (!promptEvent) return;

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === "accepted") {
      setVisible(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={install}
      className="fixed bottom-20 left-1/2 z-40 h-11 -translate-x-1/2 rounded-full px-5 shadow-lg md:hidden"
    >
      <Download className="size-4" />
      Instalar app
    </Button>
  );
}
