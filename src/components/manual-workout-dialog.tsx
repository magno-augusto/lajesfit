import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const ACTIVITIES = ["Corrida", "Caminhada", "Bike", "Trilha", "Musculação", "Natação", "Funcional", "Outro"];

export function ManualWorkoutDialog({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const activity_type = String(fd.get("activity_type") || "Outro");
    const title = String(fd.get("title") || "") || null;
    const duration_min = Number(fd.get("duration_min") || 0);
    const distance_km = Number(fd.get("distance_km") || 0);
    const calories = Number(fd.get("calories") || 0);
    const notes = String(fd.get("notes") || "") || null;

    setLoading(true);
    try {
      const { error } = await supabase.from("workouts").insert({
        user_id: userId,
        activity_type,
        title,
        duration_seconds: duration_min ? duration_min * 60 : null,
        distance_meters: distance_km ? distance_km * 1000 : null,
        calories: calories || null,
        notes,
      });
      if (error) throw error;
      toast.success("Treino registrado!");
      setOpen(false);
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4 mr-2" /> Registrar treino</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo treino</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Atividade</Label>
            <Select name="activity_type" defaultValue="Corrida">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITIES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-title">Título (opcional)</Label>
            <Input id="w-title" name="title" placeholder="Corrida no final da tarde" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label htmlFor="w-dur">Minutos</Label><Input id="w-dur" name="duration_min" type="number" min={0} /></div>
            <div className="space-y-2"><Label htmlFor="w-dist">Km</Label><Input id="w-dist" name="distance_km" type="number" step="0.01" min={0} /></div>
            <div className="space-y-2"><Label htmlFor="w-cal">Kcal</Label><Input id="w-cal" name="calories" type="number" min={0} /></div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-notes">Notas</Label>
            <Textarea id="w-notes" name="notes" rows={3} placeholder="Como foi o treino?" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Salvando..." : "Salvar treino"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
