import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, formatSelectedDate, isSameLocalDate, startOfLocalDay } from "@/lib/date";
import { formatDistance, formatDuration, timeAgo } from "@/features/feed/format";
import { consumePendingNewAction, NEW_ACTION_EVENT } from "@/components/new-action-menu";
import { useFitness } from "@/features/fitness/useFitness";
import { ManualWorkoutDialog } from "./ManualWorkoutDialog";
import { WeeklyWorkoutChart } from "./WeeklyWorkoutChart";
import { addWorkout, removeWorkout, updateWorkout, type LocalWorkout } from "./workouts-api";
import { getStravaAuthorizationUrl, getStravaConnection, syncStravaActivities } from "./strava-api";

function buildStartedAtForSelectedDay(day: Date) {
  const now = new Date();
  const startedAt = new Date(day);
  startedAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return startedAt.toISOString();
}

export function WorkoutsPage() {
  const { workouts, loading } = useFitness();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaBusy, setStravaBusy] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay(new Date()));

  useEffect(() => {
    if (consumePendingNewAction("workout")) setAddWorkoutOpen(true);

    function handleNewAction(event: Event) {
      if ((event as CustomEvent).detail === "workout") setAddWorkoutOpen(true);
    }

    window.addEventListener(NEW_ACTION_EVENT, handleNewAction);
    return () => window.removeEventListener(NEW_ACTION_EVENT, handleNewAction);
  }, []);

  useEffect(() => {
    getStravaConnection()
      .then((connection) => setStravaConnected(connection.connected))
      .catch(() => setStravaConnected(false));
  }, []);

  async function handleCreate(workout: Omit<LocalWorkout, "id">) {
    await addWorkout(workout);
  }

  const dayWorkouts = useMemo(
    () => workouts.filter((workout) => isSameLocalDate(workout.startedAt, selectedDate)),
    [selectedDate, workouts],
  );

  const totals = useMemo(
    () =>
      dayWorkouts.reduce(
        (acc, workout) => ({
          distance: acc.distance + (workout.distanceMeters ?? 0),
          duration: acc.duration + (workout.durationSeconds ?? 0),
          calories: acc.calories + (workout.calories ?? 0),
          count: acc.count + 1,
        }),
        { distance: 0, duration: 0, calories: 0, count: 0 },
      ),
    [dayWorkouts],
  );

  async function handleRemove(id: string) {
    setDeletingId(id);
    try {
      await removeWorkout(id);
      toast.success("Treino removido");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel remover o treino");
    } finally {
      setDeletingId(null);
    }
  }

  async function connectStrava() {
    setStravaBusy(true);
    try {
      const state = crypto.randomUUID();
      sessionStorage.setItem("lajesfit-strava-oauth-state", state);
      const redirectUri = `${window.location.origin}/strava/callback`;
      const { url } = await getStravaAuthorizationUrl({ data: { redirectUri, state } });
      window.location.assign(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel iniciar o Strava");
      setStravaBusy(false);
    }
  }

  async function importStravaActivities() {
    setStravaBusy(true);
    try {
      const result = await syncStravaActivities({ data: { afterDays: 90 } });
      window.dispatchEvent(new Event("lajesfit-backend-change"));
      toast.success(
        result.imported > 0
          ? `${result.imported} atividade(s) importada(s)`
          : "Nenhuma atividade nova encontrada",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel importar do Strava");
    } finally {
      setStravaBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => setSelectedDate((date) => addDays(date, -1))}
          aria-label="Ver dia anterior"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="min-w-44 rounded-full px-4 capitalize"
            >
              <CalendarIcon className="mr-2 size-4" />
              {formatSelectedDate(selectedDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) setSelectedDate(startOfLocalDay(date));
              }}
            />
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => setSelectedDate((date) => addDays(date, 1))}
          aria-label="Ver dia posterior"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div className="rounded-lg bg-gradient-hero text-primary-foreground p-3.5 shadow-glow">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest opacity-80">
              Resumo dos exercicios
            </p>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium opacity-90">
              <Flame className="size-3.5" />
              <span>Calorias</span>
            </div>
            <p className="font-display text-3xl mt-1">
              {Math.round(totals.calories)} <span className="text-sm font-sans">kcal</span>
            </p>
          </div>
          <ManualWorkoutDialog
            onSaved={handleCreate}
            open={addWorkoutOpen}
            onOpenChange={setAddWorkoutOpen}
            defaultStartedAt={buildStartedAtForSelectedDay(selectedDate)}
          />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={stravaConnected ? importStravaActivities : connectStrava}
            disabled={stravaBusy}
          >
            {stravaConnected ? (
              <>
                <RefreshCw className="mr-2 size-4" />
                {stravaBusy ? "Importando..." : "Importar do Strava"}
              </>
            ) : (
              <>
                <Activity className="mr-2 size-4" />
                {stravaBusy ? "Abrindo..." : "Conectar Strava"}
              </>
            )}
          </Button>
          {stravaConnected && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
              onClick={connectStrava}
              disabled={stravaBusy}
            >
              Reconectar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2.5">
          <div className="bg-primary-foreground/10 rounded-lg p-2">
            <p className="text-[11px] text-primary-foreground/70">Treinos</p>
            <p className="font-display text-lg">{totals.count}</p>
          </div>
          <div className="bg-primary-foreground/10 rounded-lg p-2">
            <p className="text-[11px] text-primary-foreground/70">Tempo</p>
            <p className="font-display text-lg">{formatDuration(totals.duration)}</p>
          </div>
          <div className="bg-primary-foreground/10 rounded-lg p-2">
            <p className="text-[11px] text-primary-foreground/70">Distancia</p>
            <p className="font-display text-lg">{formatDistance(totals.distance)}</p>
          </div>
        </div>
      </div>

      <WeeklyWorkoutChart workouts={workouts} />

      <div className="bg-card rounded-lg border shadow-card">
        <div className="p-4 border-b">
          <h2 className="font-display text-2xl">MEUS TREINOS</h2>
        </div>
        <ul className="divide-y">
          {loading && (
            <li className="p-8 text-center text-muted-foreground text-sm">Carregando treinos...</li>
          )}
          {!loading && dayWorkouts.length === 0 && (
            <li className="p-8 text-center text-muted-foreground text-sm">
              Nenhum treino registrado neste dia
            </li>
          )}
          {dayWorkouts.map((workout) => {
            const hasCalories = typeof workout.calories === "number" && workout.calories > 0;
            const durationLabel = formatDuration(workout.durationSeconds);
            const distanceLabel = formatDistance(workout.distanceMeters);
            return (
              <li key={workout.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/40">
                {workout.mediaUrl ? (
                  <img src={workout.mediaUrl} alt="" className="size-10 rounded-lg object-cover" />
                ) : (
                  <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    <Activity className="size-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {workout.name ?? workout.activityType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {workout.activityType} - {timeAgo(workout.startedAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {distanceLabel !== "-" && <p className="font-display text-lg">{distanceLabel}</p>}
                  <div className="mt-0.5 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    {durationLabel !== "-" && (
                      <>
                        <span>{durationLabel}</span>
                        <span>-</span>
                      </>
                    )}
                    <Flame className="size-3.5" />
                    <span>
                      {hasCalories ? `${Math.round(workout.calories!)} kcal` : "nao informado"}
                    </span>
                  </div>
                </div>
                <ManualWorkoutDialog
                  initialWorkout={workout}
                  onSaved={(updatedWorkout) => updateWorkout(workout.id, updatedWorkout)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(workout.id)}
                  disabled={deletingId === workout.id}
                  aria-label="Remover treino"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
