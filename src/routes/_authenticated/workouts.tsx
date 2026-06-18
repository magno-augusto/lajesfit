import { createFileRoute } from "@tanstack/react-router";
import { ManualWorkoutDialog } from "@/components/manual-workout-dialog";
import { Activity } from "lucide-react";
import { formatDistance, formatDuration, timeAgo } from "@/lib/feed";
import { addWorkout, useLocalFitness, type LocalWorkout } from "@/lib/local-fitness";

export const Route = createFileRoute("/_authenticated/workouts")({
  head: () => ({ meta: [{ title: "Treinos - Lajes Fit" }] }),
  component: WorkoutsPage,
});

function WorkoutsPage() {
  const { workouts } = useLocalFitness();

  function handleCreate(workout: Omit<LocalWorkout, "id">) {
    addWorkout(workout);
  }

  const totals = workouts.reduce(
    (acc, workout) => ({
      distance: acc.distance + (workout.distanceMeters ?? 0),
      duration: acc.duration + (workout.durationSeconds ?? 0),
      calories: acc.calories + workout.calories,
      count: acc.count + 1,
    }),
    { distance: 0, duration: 0, calories: 0, count: 0 },
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-lg bg-gradient-hero text-primary-foreground p-6 shadow-glow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Resumo dos exercicios</p>
            <p className="font-display text-5xl mt-1">{formatDistance(totals.distance)}</p>
          </div>
          <ManualWorkoutDialog onCreated={handleCreate} />
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
            <p className="opacity-70 text-xs">Calorias</p>
            <p className="font-display text-xl">{Math.round(totals.calories)}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-card">
        <div className="p-4 border-b">
          <h2 className="font-display text-2xl">MEUS TREINOS</h2>
        </div>
        <ul className="divide-y">
          {workouts.length === 0 && (
            <li className="p-8 text-center text-muted-foreground text-sm">
              Nenhum treino registrado ainda
            </li>
          )}
          {workouts.map((workout) => (
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
              <div className="text-right">
                <p className="font-display text-lg">{formatDistance(workout.distanceMeters)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(workout.durationSeconds)} - {Math.round(workout.calories)} kcal
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
