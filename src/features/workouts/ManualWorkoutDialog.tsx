import { useCallback, useEffect, useRef, useState } from "react";
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
import { clearDraft, readDraft, writeDraft } from "@/lib/session-draft";
import {
  compressImageDataUrl,
  dataUrlToBlob,
  readFileAsDataUrl,
} from "@/features/diet/image-utils";
import { uploadWorkoutPhoto, type LocalWorkout } from "./workouts-api";

const ACTIVITIES = ["Corrida", "Caminhada", "Ciclismo", "Musculacao", "Trilha", "Natacao", "Outro"];

// Modalidades sem nocao de distancia percorrida
const NO_DISTANCE_ACTIVITIES = ["Musculacao"];

const WORKOUT_DRAFT_KEY = "lajesfit-workout-draft";
const WORKOUT_DRAFT_VERSION = 1;
const WORKOUT_DRAFT_TTL_MS = 12 * 60 * 60 * 1000;

type WorkoutDraft = {
  // modal estava aberto: reabrir e restaurar os campos apos um reload
  open: boolean;
  activityType: string;
  name: string;
  startedAt: string;
  distanceKm: string;
  calories: string;
  hours: string;
  minutes: string;
  photoDataUrl: string | null;
};

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
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialWorkout?.mediaUrl ?? null);
  const [draftReady, setDraftReady] = useState(false);
  const skipOpenResetRef = useRef(false);
  const wasOpenRef = useRef(false);
  const photoDraftWarnedRef = useRef(false);
  const showDistance = !NO_DISTANCE_ACTIVITIES.includes(activityType);
  const photoPreview = photoDataUrl ?? photoUrl;

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    // reset apenas na transicao fechado -> aberto: `defaultStartedAt` muda de
    // identidade a cada render da pagina e nao pode apagar o formulario em uso
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    if (skipOpenResetRef.current) {
      // rascunho restaurado: nao sobrescrever os campos restaurados
      skipOpenResetRef.current = false;
      return;
    }

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
    setPhotoDataUrl(null);
    setPhotoUrl(initialWorkout?.mediaUrl ?? null);
  }, [defaultStartedAt, initialWorkout, open]);

  function setOpen(nextOpen: boolean) {
    if (onOpenChange) onOpenChange(nextOpen);
    else setInternalOpen(nextOpen);
  }

  // Restaura o rascunho apos um reload (ex.: Android descartou o app em
  // background). Instancias de edicao nao usam rascunho.
  useEffect(() => {
    if (editing) {
      setDraftReady(true);
      return;
    }
    const draft = readDraft<Partial<WorkoutDraft>>(
      WORKOUT_DRAFT_KEY,
      WORKOUT_DRAFT_VERSION,
      WORKOUT_DRAFT_TTL_MS,
    );
    if (!draft) {
      setDraftReady(true);
      return;
    }

    if (typeof draft.activityType === "string" && ACTIVITIES.includes(draft.activityType)) {
      setActivityType(draft.activityType);
    }
    if (typeof draft.name === "string") setName(draft.name);
    if (typeof draft.startedAt === "string") setStartedAt(draft.startedAt);
    if (typeof draft.distanceKm === "string") setDistanceKm(draft.distanceKm);
    if (typeof draft.calories === "string") setCalories(draft.calories);
    if (typeof draft.hours === "string") setHours(draft.hours);
    if (typeof draft.minutes === "string") setMinutes(draft.minutes);
    if (typeof draft.photoDataUrl === "string") setPhotoDataUrl(draft.photoDataUrl);
    if (draft.open) {
      skipOpenResetRef.current = true;
      setOpen(true);
    }
    setDraftReady(true);
    // restauracao do rascunho roda apenas no mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildDraft = useCallback(
    (): WorkoutDraft => ({
      open,
      activityType,
      name,
      startedAt,
      distanceKm,
      calories,
      hours,
      minutes,
      photoDataUrl,
    }),
    [activityType, calories, distanceKm, hours, minutes, name, open, photoDataUrl, startedAt],
  );

  useEffect(() => {
    if (!draftReady || editing) return;

    // invariante: rascunho existe <=> modal de registro esta aberto
    if (!open) {
      clearDraft(WORKOUT_DRAFT_KEY);
      return;
    }

    if (writeDraft(WORKOUT_DRAFT_KEY, WORKOUT_DRAFT_VERSION, buildDraft())) {
      photoDraftWarnedRef.current = false;
      return;
    }

    // quota estourada (foto grande): mantem ao menos os campos sem a foto
    writeDraft(WORKOUT_DRAFT_KEY, WORKOUT_DRAFT_VERSION, { ...buildDraft(), photoDataUrl: null });
    if (photoDataUrl && !photoDraftWarnedRef.current) {
      photoDraftWarnedRef.current = true;
      toast.error("A foto ficou grande demais para manter como rascunho. Tente tirar outra foto.");
    }
  }, [buildDraft, draftReady, editing, open, photoDataUrl]);

  async function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem valida");
      return;
    }

    try {
      // data URL comprimido: persiste no rascunho e sobrevive a um reload
      const rawDataUrl = await readFileAsDataUrl(file);
      setPhotoDataUrl(await compressImageDataUrl(rawDataUrl));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar a foto");
    }
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
      if (photoDataUrl) {
        const blob = await dataUrlToBlob(photoDataUrl);
        mediaUrl = await uploadWorkoutPhoto(
          new File([blob], "treino.jpg", { type: blob.type || "image/jpeg" }),
        );
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
                      setPhotoDataUrl(null);
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
                <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
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
