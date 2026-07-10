import { useEffect, useState } from "react";
import { CheckCircle2, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BOARD_LABELS } from "./board-meta";
import { markPodiumEventShared, type PodiumEvent } from "./podium-events-api";
import { buildPodiumImage } from "./podium-share-image";

export function PodiumShareDialog({
  event,
  open,
  onOpenChange,
  onShared,
}: {
  event: PodiumEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShared: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [marking, setMarking] = useState(false);

  // gera a imagem na abertura (nao no clique) para o navigator.share ficar
  // dentro do gesto do usuario, como o prepareShareFile do PostCard
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    let url: string | null = null;
    setBuilding(true);
    buildPodiumImage(event)
      .then((blob) => {
        if (!mounted || !blob) return;
        const imageFile = new File([blob], "lajesfit-podio.jpg", { type: "image/jpeg" });
        url = URL.createObjectURL(imageFile);
        setFile(imageFile);
        setPreviewUrl(url);
      })
      .finally(() => {
        if (mounted) setBuilding(false);
      });
    return () => {
      mounted = false;
      if (url) URL.revokeObjectURL(url);
      setFile(null);
      setPreviewUrl(null);
    };
  }, [open, event]);

  const label = BOARD_LABELS[event.board] ?? "do mes";
  const canUseWebShare =
    file !== null &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  async function markShared() {
    setMarking(true);
    try {
      await markPodiumEventShared(event.id);
      onShared();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel marcar como compartilhado",
      );
    } finally {
      setMarking(false);
    }
  }

  async function handleShare() {
    if (!file) return;
    try {
      await navigator.share({
        text: `👑 Temos um novo lider no desafio ${label}!`,
        files: [file],
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error("Nao foi possivel compartilhar a imagem");
      return;
    }
    await markShared();
  }

  function handleDownload() {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = "lajesfit-podio.jpg";
    link.click();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Podio · {label}</DialogTitle>
        </DialogHeader>

        {event.sharedAt && (
          <p className="flex items-center gap-1.5 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
            Este podio ja foi compartilhado. Voce pode enviar de novo se quiser.
          </p>
        )}

        {building || !previewUrl ? (
          <Skeleton className="aspect-[4/5] w-full rounded-lg" />
        ) : (
          <img
            src={previewUrl}
            alt={`Podio do desafio ${label}`}
            className="aspect-[4/5] w-full rounded-lg object-cover"
          />
        )}

        {canUseWebShare ? (
          <Button className="w-full" disabled={building || marking} onClick={handleShare}>
            <Share2 className="size-4" />
            Compartilhar no grupo
          </Button>
        ) : (
          <div className="space-y-2">
            <Button
              className="w-full"
              variant="secondary"
              disabled={building || !previewUrl}
              onClick={handleDownload}
            >
              <Download className="size-4" />
              Baixar imagem
            </Button>
            <Button className="w-full" disabled={marking} onClick={markShared}>
              <CheckCircle2 className="size-4" />
              Marcar como compartilhado
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
