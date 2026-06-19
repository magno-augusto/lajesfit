import { useState } from "react";
import { Activity, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type LocalWorkout } from "@/lib/local-fitness";

const ACTIVITIES = ["Corrida", "Caminhada", "Ciclismo", "Musculacao", "Trilha", "Natacao", "Outro"];

export function ManualWorkoutDialog({
  initialWorkout,
  onSaved,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: {
  userId?: string;
  initialWorkout?: LocalWorkout;
  onCreated?: (workout: Omit<LocalWorkout, "id">) => void | Promise<void>;
  onSaved: (workout: Omit<LocalWorkout, "id">) => void | Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const editing = Boolean(initialWorkout);
  const open = controlledOpen ?? internalOpen;
  const durationSeconds = initialWorkout?.durationSeconds ?? 0;
  const defaultHours = Math.floor(durationSeconds / 3600);
  const defaultMinutes = Math.floor((durationSeconds % 3600) / 60);

  function setOpen(nextOpen: boolean) {
    if (onOpenChange) onOpenChange(nextOpen);
    else setInternalOpen(nextOpen);
  }

  function formatDateTimeLocal(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
  }

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
      await onSaved({
        activityType: String(fd.get("activity_type") || "Corrida"),
        name: String(fd.get("name") || "") || null,
        distanceMeters: fd.get("distance_km") ? Number(fd.get("distance_km")) * 1000 : null,
        durationSeconds: duration || null,
        calories: fd.get("calories") ? Number(fd.get("calories")) : null,
        startedAt: startedAt ? new Date(startedAt).toISOString() : new Date().toISOString(),
      });

      toast.success(editing ? "Treino atualizado!" : "Treino registrado!");
      form.reset();
      setOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar treino");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          {editing ? (
            <Button variant="ghost" size="icon" aria-label="Editar treino">
              <Pencil className="size-4" />
            </Button>
          ) : (
            <Button size="sm" variant="secondary">
              <Plus className="size-4 mr-1" /> Registrar
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="size-5" /> {editing ? "Editar treino" : "Registrar treino"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select name="activity_type" defaultValue={initialWorkout?.activityType ?? "Corrida"}>
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
              <Input
                id="workout-name"
                name="name"
                placeholder="Treino matinal"
                maxLength={120}
                defaultValue={initialWorkout?.name ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="started-at">Data e hora</Label>
            <Input
              id="started-at"
              name="started_at"
              type="datetime-local"
              defaultValue={formatDateTimeLocal(initialWorkout?.startedAt)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="distance-km">Distancia (km)</Label>
              <Input
                id="distance-km"
                name="distance_km"
                type="number"
                min="0"
                step="0.01"
                placeholder="5.2"
                defaultValue={
                  initialWorkout?.distanceMeters ? initialWorkout.distanceMeters / 1000 : ""
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calories">Calorias queimadas (kcal)</Label>
              <Input
                id="calories"
                name="calories"
                type="number"
                min="0"
                step="1"
                placeholder="320"
                defaultValue={initialWorkout?.calories ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Horas</Label>
              <Input
                id="hours"
                name="hours"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                defaultValue={defaultHours || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutes">Minutos</Label>
              <Input
                id="minutes"
                name="minutes"
                type="number"
                min="0"
                max="59"
                step="1"
                placeholder="45"
                defaultValue={defaultMinutes || ""}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : editing ? "Salvar alteracoes" : "Salvar treino"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
