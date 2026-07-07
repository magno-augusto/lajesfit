import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Plus, Video, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getVideoDuration } from "@/lib/validation";
import { clearDraft, readDraft, writeDraft } from "@/lib/session-draft";
import {
  compressImageDataUrl,
  dataUrlToBlob,
  readFileAsDataUrl,
} from "@/features/diet/image-utils";
import { createPost, uploadPostMedia } from "./posts-api";

const POST_DRAFT_KEY = "lajesfit-post-draft";
const POST_DRAFT_VERSION = 1;
const POST_DRAFT_TTL_MS = 12 * 60 * 60 * 1000;

type PostDraft = {
  // modal estava aberto: reabrir e restaurar os campos apos um reload
  open: boolean;
  content: string;
  imageDataUrl: string | null;
  // video nao cabe no sessionStorage: so avisa que se perdeu
  hadVideo: boolean;
};

export function CreatePostDialog({
  userId,
  onCreated,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: {
  userId: string;
  onCreated: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [content, setContent] = useState("");
  // imagem vira data URL comprimido: persiste no rascunho e sobrevive a um
  // reload; video fica como File/blob em memoria (nao cabe no sessionStorage)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const imageDraftWarnedRef = useRef(false);
  const open = controlledOpen ?? internalOpen;
  const mediaIsVideo = Boolean(videoFile);
  const preview = imageDataUrl ?? videoPreview;

  function setOpen(nextOpen: boolean) {
    if (onOpenChange) onOpenChange(nextOpen);
    else setInternalOpen(nextOpen);
  }

  function clearFile() {
    setImageDataUrl(null);
    setVideoFile(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
  }

  // Restaura o rascunho apos um reload (ex.: Android descartou o app em background)
  useEffect(() => {
    const draft = readDraft<Partial<PostDraft>>(
      POST_DRAFT_KEY,
      POST_DRAFT_VERSION,
      POST_DRAFT_TTL_MS,
    );
    if (!draft) {
      setDraftReady(true);
      return;
    }

    if (typeof draft.content === "string") setContent(draft.content);
    if (typeof draft.imageDataUrl === "string") setImageDataUrl(draft.imageDataUrl);
    if (draft.open) setOpen(true);
    if (draft.hadVideo) {
      toast.error("Nao foi possivel manter o video. Adicione o video novamente.");
    }
    setDraftReady(true);
    // restauracao do rascunho roda apenas no mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildDraft = useCallback(
    (): PostDraft => ({
      open,
      content,
      imageDataUrl,
      hadVideo: Boolean(videoFile),
    }),
    [content, imageDataUrl, open, videoFile],
  );

  useEffect(() => {
    if (!draftReady) return;

    // invariante: rascunho existe <=> modal de post esta aberto
    if (!open) {
      clearDraft(POST_DRAFT_KEY);
      return;
    }

    if (writeDraft(POST_DRAFT_KEY, POST_DRAFT_VERSION, buildDraft())) {
      imageDraftWarnedRef.current = false;
      return;
    }

    // quota estourada (imagem grande): mantem ao menos o texto
    writeDraft(POST_DRAFT_KEY, POST_DRAFT_VERSION, { ...buildDraft(), imageDataUrl: null });
    if (imageDataUrl && !imageDraftWarnedRef.current) {
      imageDraftWarnedRef.current = true;
      toast.error("A foto ficou grande demais para manter como rascunho. Tente tirar outra foto.");
    }
  }, [buildDraft, draftReady, imageDataUrl, open]);

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = e.target.files?.[0];
    e.target.value = "";
    if (!nextFile) return;

    if (!nextFile.type.startsWith("image/") && !nextFile.type.startsWith("video/")) {
      toast.error("Selecione uma foto ou video");
      return;
    }

    if (nextFile.type.startsWith("video/")) {
      const durationUrl = URL.createObjectURL(nextFile);
      const duration = await getVideoDuration(durationUrl);
      if (duration > 15.5) {
        URL.revokeObjectURL(durationUrl);
        toast.error("O video deve ter ate 15 segundos");
        return;
      }
      clearFile();
      setVideoFile(nextFile);
      setVideoPreview(durationUrl);
      return;
    }

    try {
      const rawDataUrl = await readFileAsDataUrl(nextFile);
      const dataUrl = await compressImageDataUrl(rawDataUrl);
      clearFile();
      setImageDataUrl(dataUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar a foto");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text && !videoFile && !imageDataUrl) {
      toast.error("Adicione um texto, foto ou video");
      return;
    }

    setLoading(true);
    try {
      let mediaUrl: string | null = null;
      if (videoFile) {
        mediaUrl = await uploadPostMedia(userId, videoFile);
      } else if (imageDataUrl) {
        const blob = await dataUrlToBlob(imageDataUrl);
        mediaUrl = await uploadPostMedia(
          userId,
          new File([blob], "post.jpg", { type: blob.type || "image/jpeg" }),
        );
      }
      await createPost({ userId, content: text, mediaUrl });

      toast.success("Post publicado");
      setContent("");
      clearFile();
      setOpen(false);
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button className="w-full" size="lg">
            <Plus className="mr-2 size-4" /> Novo post
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo post no feed</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {preview ? (
            <div className="relative overflow-hidden rounded-xl border shadow-card">
              {mediaIsVideo ? (
                <video src={preview} controls className="max-h-64 w-full bg-black object-cover" />
              ) : (
                <img src={preview} alt="" className="max-h-64 w-full object-cover" />
              )}
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute right-2 top-2"
                onClick={clearFile}
                aria-label="Remover midia"
              >
                <X className="size-4" />
              </Button>
              <label className="absolute bottom-2 right-2 cursor-pointer">
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={pickFile}
                />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                  {mediaIsVideo ? (
                    <Video className="size-3.5" />
                  ) : (
                    <ImageIcon className="size-3.5" />
                  )}
                  Trocar
                </span>
              </label>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <input type="file" accept="image/*,video/*" className="hidden" onChange={pickFile} />
              <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-b from-primary/5 to-primary/10 px-4 text-center transition-colors hover:border-primary/50 hover:bg-primary/10">
                <span className="flex size-12 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                  <ImageIcon className="size-5" />
                </span>
                <span className="text-sm font-semibold">Adicionar foto ou video</span>
                <span className="text-xs text-muted-foreground">
                  Toque para escolher · videos de ate 15 segundos
                </span>
              </div>
            </label>
          )}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva algo para o feed..."
            rows={3}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Publicando..." : "Publicar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
