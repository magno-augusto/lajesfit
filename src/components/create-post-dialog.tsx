import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image as ImageIcon, Plus, Activity, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function CreatePostDialog({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"general" | "workout">("general");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  // Workout fields
  const [activity, setActivity] = useState("Corrida");
  const [distance, setDistance] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [calories, setCalories] = useState("");
  const [name, setName] = useState("");

  async function upload(file: File) {
    const ext = file.name.split(".").pop();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) throw error;
    return path;
  }

  async function submit() {
    if (!content.trim() && files.length === 0 && tab !== "workout") {
      toast.error("Adicione uma foto, vídeo ou texto");
      return;
    }
    setLoading(true);
    try {
      const paths: string[] = [];
      for (const f of files) paths.push(await upload(f));

      let workoutId: string | null = null;
      if (tab === "workout") {
        const duration = (Number(hours || 0) * 3600) + (Number(minutes || 0) * 60);
        const { data: w, error } = await supabase.from("workouts").insert({
          user_id: userId, source: "manual", activity_type: activity, name: name || null,
          distance_meters: distance ? Number(distance) * 1000 : null,
          duration_seconds: duration || null,
          calories: calories ? Number(calories) : null,
          started_at: new Date().toISOString(),
        }).select("id").single();
        if (error) throw error;
        workoutId = w.id;
      }

      const { error: pe } = await supabase.from("posts").insert({
        user_id: userId,
        type: tab === "workout" ? "workout" : "general",
        content: content || null,
        media_urls: paths,
        workout_id: workoutId,
      });
      if (pe) throw pe;

      toast.success("Publicado!");
      setOpen(false);
      setContent(""); setFiles([]); setDistance(""); setHours(""); setMinutes(""); setCalories(""); setName("");
      onCreated();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao publicar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full justify-start text-muted-foreground" variant="outline">
          <Plus className="size-4 mr-2" /> Compartilhe seu treino ou refeição...
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Nova publicação</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="general"><ImageIcon className="size-4 mr-2" />Foto / Texto</TabsTrigger>
            <TabsTrigger value="workout"><Activity className="size-4 mr-2" />Treino</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-3 mt-4">
            <Textarea placeholder="O que rolou no treino hoje?" value={content} onChange={(e) => setContent(e.target.value)} rows={4} maxLength={1000} />
          </TabsContent>
          <TabsContent value="workout" className="space-y-3 mt-4">
            <Textarea placeholder="Como foi o treino?" value={content} onChange={(e) => setContent(e.target.value)} rows={3} maxLength={1000} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Modalidade</label>
                <select value={activity} onChange={(e) => setActivity(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                  <option>Corrida</option><option>Caminhada</option><option>Ciclismo</option>
                  <option>Musculação</option><option>Trilha</option><option>Natação</option><option>Outro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Nome (opcional)</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Treino matinal" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Distância (km)</label>
                <Input type="number" step="0.01" value={distance} onChange={(e) => setDistance(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Calorias</label>
                <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Horas</label>
                <Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Minutos</label>
                <Input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            <ImageIcon className="size-4" />
            <span>Adicionar fotos/vídeos</span>
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 4))} />
          </label>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {files.map((f, i) => (
                <div key={i} className="relative">
                  <div className="size-16 rounded-md border bg-muted grid place-items-center text-xs px-1 text-center overflow-hidden">{f.name.slice(0, 20)}</div>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full size-5 grid place-items-center"><X className="size-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button onClick={submit} disabled={loading} className="w-full">{loading ? "Publicando..." : "Publicar"}</Button>
      </DialogContent>
    </Dialog>
  );
}
