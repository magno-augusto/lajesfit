import { useState } from "react";
import { Activity, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ACTIVITIES = ["Corrida", "Caminhada", "Ciclismo", "Musculacao", "Trilha", "Natacao", "Outro"];

export function ManualWorkoutDialog({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const hours = Number(fd.get("hours") || 0);
    const minutes = Number(fd.get("minutes") || 0);
    const duration = hours * 3600 + minutes * 60;
    const startedAt = String(fd.get("started_at") || "");

    setLoading(true);
    try {
      const { error } = await supabase.from("workouts").insert({
        user_id: userId,
        source: "manual",
        activity_type: String(fd.get("activity_type") || "Corrida"),
        name: String(fd.get("name") || "") || null,
        distance_meters: fd.get("distance_km") ? Number(fd.get("distance_km")) * 1000 : null,
        duration_seconds: duration || null,
        calories: fd.get("calories") ? Number(fd.get("calories")) : null,
        started_at: startedAt ? new Date(startedAt).toISOString() : new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Treino registrado!");
      form.reset();
      setOpen(false);
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar treino");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="size-4 mr-1" /> Registrar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="size-5" /> Registrar treino
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select name="activity_type" defaultValue="Corrida">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITIES.map((activity) => (
                    <SelectItem key={activity} value={activity}>
                      {activity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workout-name">Nome</Label>
              <Input id="workout-name" name="name" placeholder="Treino matinal" maxLength={120} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="started-at">Data e hora</Label>
            <Input id="started-at" name="started_at" type="datetime-local" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="distance-km">Distancia (km)</Label>
              <Input id="distance-km" name="distance_km" type="number" min="0" step="0.01" placeholder="5.2" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calories">Calorias</Label>
              <Input id="calories" name="calories" type="number" min="0" step="1" placeholder="320" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Horas</Label>
              <Input id="hours" name="hours" type="number" min="0" step="1" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutes">Minutos</Label>
              <Input id="minutes" name="minutes" type="number" min="0" max="59" step="1" placeholder="45" />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Registrando..." : "Salvar treino"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
