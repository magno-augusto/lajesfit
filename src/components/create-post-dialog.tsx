import { useState } from "react";
import { Plus, ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export function CreatePostDialog({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function clearFile() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text && !file) return;
    setLoading(true);
    try {
      let media_url: string | null = null;
      if (file) {
        const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, file);
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        media_url = signed?.signedUrl ?? null;
      }
      const { error } = await supabase.from("posts").insert({ user_id: userId, content: text, media_url });
      if (error) throw error;
      toast.success("Post publicado!");
      setContent(""); clearFile(); setOpen(false);
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg"><Plus className="size-4 mr-2" /> Novo post</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Compartilhe com a galera</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="No que você treinou hoje?" rows={4} />
          {preview && (
            <div className="relative">
              <img src={preview} alt="" className="rounded-lg max-h-60 w-full object-cover" />
              <Button type="button" size="icon" variant="secondary" className="absolute top-2 right-2" onClick={clearFile}><X className="size-4" /></Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={pickFile} />
              <Button type="button" variant="outline" size="sm" asChild><span><ImageIcon className="size-4 mr-2" /> Foto</span></Button>
            </label>
            <Button type="submit" disabled={loading} className="ml-auto">{loading ? "Publicando..." : "Publicar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
