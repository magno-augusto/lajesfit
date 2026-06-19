import { useState } from "react";
import { ImageIcon, Plus, Video, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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

  function getVideoDuration(url: string) {
    return new Promise<number>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => reject(new Error("Nao foi possivel ler o video"));
      video.src = url;
    });
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
      let media_url: string | null = null;
      if (file) {
        const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, file);
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("media")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        media_url = signed?.signedUrl ?? null;
      }

      const { error } = await supabase
        .from("posts")
        .insert({ user_id: userId, content: text, media_url });
      if (error) throw error;

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
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva algo para o feed..."
            rows={4}
          />
          {preview && (
            <div className="relative">
              {mediaIsVideo ? (
                <video
                  src={preview}
                  controls
                  className="max-h-60 w-full rounded-lg bg-black object-cover"
                />
              ) : (
                <img src={preview} alt="" className="max-h-60 w-full rounded-lg object-cover" />
              )}
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute right-2 top-2"
                onClick={clearFile}
              >
                <X className="size-4" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input type="file" accept="image/*,video/*" className="hidden" onChange={pickFile} />
              <Button type="button" variant="outline" size="sm" asChild>
                <span>
                  {mediaIsVideo ? (
                    <Video className="mr-2 size-4" />
                  ) : (
                    <ImageIcon className="mr-2 size-4" />
                  )}
                  Foto ou video
                </span>
              </Button>
            </label>
            <Button type="submit" disabled={loading} className="ml-auto">
              {loading ? "Publicando..." : "Publicar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Videos devem ter no maximo 15 segundos.</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
