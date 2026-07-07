import { useState } from "react";
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
import { createPost, uploadPostMedia } from "./posts-api";

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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const mediaIsVideo = file?.type.startsWith("video/") ?? false;

  function setOpen(nextOpen: boolean) {
    if (onOpenChange) onOpenChange(nextOpen);
    else setInternalOpen(nextOpen);
  }

  function clearFile() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }

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
        toast.error("O video deve ter ate 15 segundos");
        return;
      }
    }

    clearFile();
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text && !file) {
      toast.error("Adicione um texto, foto ou video");
      return;
    }

    setLoading(true);
    try {
      const mediaUrl = file ? await uploadPostMedia(userId, file) : null;
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
