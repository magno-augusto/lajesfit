import { createFileRoute } from "@tanstack/react-router";
import { ManualWorkoutDialog } from "@/components/manual-workout-dialog";
import { useEffect, useState } from "react";
import { Activity, Flame, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDistance, formatDuration, timeAgo } from "@/lib/feed";
import {
  addWorkout,
  removeWorkout,
  updateWorkout,
  useLocalFitness,
  type LocalWorkout,
} from "@/lib/local-fitness";
import { consumePendingNewAction, NEW_ACTION_EVENT } from "@/components/new-action-menu";
import {
  getStravaAuthorizationUrl,
  getStravaConnection,
  syncStravaActivities,
} from "@/lib/api/strava.functions";

export const Route = createFileRoute("/_authenticated/workouts")({
  head: () => ({ meta: [{ title: "Treinos - Lajes Fit" }] }),
  component: WorkoutsPage,
});

function WorkoutsPage() {
  const { workouts, loading } = useLocalFitness();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaBusy, setStravaBusy] = useState(false);

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

  const totals = workouts.reduce(
    (acc, workout) => ({
      distance: acc.distance + (workout.distanceMeters ?? 0),
      duration: acc.duration + (workout.durationSeconds ?? 0),
      calories: acc.calories + (workout.calories ?? 0),
      count: acc.count + 1,
    }),
    { distance: 0, duration: 0, calories: 0, count: 0 },
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
      sessionStorage.setItem("lajes-fit-strava-oauth-state", state);
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
      window.dispatchEvent(new Event("lajes-fit-backend-change"));
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
      <div className="rounded-lg bg-gradient-hero text-primary-foreground p-6 shadow-glow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Resumo dos exercicios</p>
            <p className="font-display text-5xl mt-1">{formatDistance(totals.distance)}</p>
          </div>
          <ManualWorkoutDialog
            onSaved={handleCreate}
            open={addWorkoutOpen}
            onOpenChange={setAddWorkoutOpen}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
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
        <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
          <div>
            <p className="opacity-70 text-xs">Treinos</p>
            <p className="font-display text-xl">{totals.count}</p>
          </div>
          <div>
            <p className="opacity-70 text-xs">Tempo</p>
            <p className="font-display text-xl">{formatDuration(totals.duration)}</p>
          </div>
          <div>
            <p className="opacity-70 text-xs">Calorias queimadas</p>
            <p className="font-display text-xl">
              {Math.round(totals.calories)} <span className="text-xs font-sans">kcal</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-card">
        <div className="p-4 border-b">
          <h2 className="font-display text-2xl">MEUS TREINOS</h2>
        </div>
        <ul className="divide-y">
          {loading && (
            <li className="p-8 text-center text-muted-foreground text-sm">Carregando treinos...</li>
          )}
          {!loading && workouts.length === 0 && (
            <li className="p-8 text-center text-muted-foreground text-sm">
              Nenhum treino registrado ainda
            </li>
          )}
          {workouts.map((workout) => {
            const hasCalories = typeof workout.calories === "number" && workout.calories > 0;
            const durationLabel = formatDuration(workout.durationSeconds);
            const distanceLabel = formatDistance(workout.distanceMeters);
            return (
            <li key={workout.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/40">
              <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <Activity className="size-5" />
              </div>
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
                  <span>{hasCalories ? `${Math.round(workout.calories!)} kcal` : "nao informado"}</span>
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
