import { useEffect, useState } from "react";
import { Activity, Camera, Pencil, Plus, X } from "lucide-react";
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
import { parseOptionalNumber } from "@/lib/validation";
import { uploadWorkoutPhoto, type LocalWorkout } from "./workouts-api";

const ACTIVITIES = ["Corrida", "Caminhada", "Ciclismo", "Musculacao", "Trilha", "Natacao", "Outro"];

// Modalidades sem nocao de distancia percorrida
const NO_DISTANCE_ACTIVITIES = ["Musculacao"];

function formatDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

export function ManualWorkoutDialog({
  initialWorkout,
  onSaved,
  open: controlledOpen,
  onOpenChange,
  defaultStartedAt,
  showTrigger = true,
  triggerWrapperClassName,
}: {
  userId?: string;
  initialWorkout?: LocalWorkout;
  onCreated?: (workout: Omit<LocalWorkout, "id">) => void | Promise<void>;
  onSaved: (workout: Omit<LocalWorkout, "id">) => void | Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultStartedAt?: string;
  showTrigger?: boolean;
  triggerWrapperClassName?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activityType, setActivityType] = useState(initialWorkout?.activityType ?? "Corrida");
  const [name, setName] = useState(
    initialWorkout?.name ?? initialWorkout?.activityType ?? "Corrida",
  );
  const [startedAt, setStartedAt] = useState(
    formatDateTimeLocal(initialWorkout?.startedAt ?? defaultStartedAt),
  );
  const [distanceKm, setDistanceKm] = useState(
    initialWorkout?.distanceMeters ? String(initialWorkout.distanceMeters / 1000) : "",
  );
  const [calories, setCalories] = useState(
    initialWorkout?.calories ? String(initialWorkout.calories) : "",
  );
  const editing = Boolean(initialWorkout);
  const open = controlledOpen ?? internalOpen;
  const durationSeconds = initialWorkout?.durationSeconds ?? 0;
  const defaultHours = Math.floor(durationSeconds / 3600);
  const defaultMinutes = Math.floor((durationSeconds % 3600) / 60);
  const [hours, setHours] = useState(defaultHours ? String(defaultHours) : "");
  const [minutes, setMinutes] = useState(defaultMinutes ? String(defaultMinutes) : "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialWorkout?.mediaUrl ?? null);
  const showDistance = !NO_DISTANCE_ACTIVITIES.includes(activityType);
  const photoPreview = photoFile ? URL.createObjectURL(photoFile) : photoUrl;

  useEffect(() => {
    if (!open) return;

    const nextDurationSeconds = initialWorkout?.durationSeconds ?? 0;
    const nextHours = Math.floor(nextDurationSeconds / 3600);
    const nextMinutes = Math.floor((nextDurationSeconds % 3600) / 60);

    setActivityType(initialWorkout?.activityType ?? "Corrida");
    setName(initialWorkout?.name ?? initialWorkout?.activityType ?? "Corrida");
    setStartedAt(formatDateTimeLocal(initialWorkout?.startedAt ?? defaultStartedAt));
    setDistanceKm(
      initialWorkout?.distanceMeters ? String(initialWorkout.distanceMeters / 1000) : "",
    );
    setCalories(initialWorkout?.calories ? String(initialWorkout.calories) : "");
    setHours(nextHours ? String(nextHours) : "");
    setMinutes(nextMinutes ? String(nextMinutes) : "");
    setPhotoFile(null);
    setPhotoUrl(initialWorkout?.mediaUrl ?? null);
  }, [defaultStartedAt, initialWorkout, open]);

  function setOpen(nextOpen: boolean) {
    if (onOpenChange) onOpenChange(nextOpen);
    else setInternalOpen(nextOpen);
  }

  // Ao trocar a modalidade, acompanha o nome padrao — mas preserva nome customizado
  function changeActivityType(nextActivity: string) {
    if (!name.trim() || name === activityType) setName(nextActivity);
    setActivityType(nextActivity);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    try {
      const parsedHours = parseOptionalNumber(hours, "Horas", { min: 0 }) ?? 0;
      const parsedMinutes = parseOptionalNumber(minutes, "Minutos", { min: 0, max: 59 }) ?? 0;
      const parsedDistanceKm = showDistance
        ? parseOptionalNumber(distanceKm, "Distancia", { min: 0 })
        : null;
      const parsedCalories = parseOptionalNumber(calories, "Calorias", { min: 0 });
      const duration = parsedHours * 3600 + parsedMinutes * 60;

      let mediaUrl = photoUrl;
      if (photoFile) {
        mediaUrl = await uploadWorkoutPhoto(photoFile);
      }

      await onSaved({
        activityType,
        name: name.trim() || null,
        distanceMeters: parsedDistanceKm === null ? null : parsedDistanceKm * 1000,
        durationSeconds: duration || null,
        calories: parsedCalories,
        startedAt: startedAt ? new Date(startedAt).toISOString() : new Date().toISOString(),
        mediaUrl,
      });

      toast.success(editing ? "Treino atualizado!" : "Treino registrado!");
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
        <span
          className={triggerWrapperClassName}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
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
        </span>
      )}
      <DialogContent
        className="sm:max-w-lg"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="size-5" /> {editing ? "Editar treino" : "Registrar treino"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select name="activity_type" value={activityType} onValueChange={changeActivityType}>
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
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="started-at">Data e hora</Label>
            <Input
              id="started-at"
              name="started_at"
              type="datetime-local"
              value={startedAt}
              onChange={(event) => setStartedAt(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {showDistance && (
              <div className="space-y-2">
                <Label htmlFor="distance-km">Distancia (km)</Label>
                <Input
                  id="distance-km"
                  name="distance_km"
                  type="number"
                  min="0"
                  step="0.01"
                  value={distanceKm}
                  onChange={(event) => setDistanceKm(event.target.value)}
                />
              </div>
            )}
            <div className={showDistance ? "space-y-2" : "col-span-2 space-y-2"}>
              <Label htmlFor="calories">Calorias queimadas (kcal)</Label>
              <Input
                id="calories"
                name="calories"
                type="number"
                min="0"
                step="1"
                value={calories}
                onChange={(event) => setCalories(event.target.value)}
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
                value={hours}
                onChange={(event) => setHours(event.target.value)}
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
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Foto</Label>
            <div className="flex items-center gap-3">
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Foto do treino"
                    className="size-16 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoUrl(null);
                    }}
                    className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
                    aria-label="Remover foto"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <div className="grid size-16 place-items-center rounded-lg border border-dashed text-muted-foreground">
                  <Camera className="size-5" />
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setPhotoFile(file);
                    event.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>{photoPreview ? "Trocar foto" : "Adicionar foto"}</span>
                </Button>
              </label>
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
