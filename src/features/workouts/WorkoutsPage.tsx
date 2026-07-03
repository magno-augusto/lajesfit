import { useEffect, useMemo, useRef, useState } from "react";

import { Activity, ChevronLeft, ChevronRight, Flame, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { addDays, formatSelectedDate, isSameLocalDate, startOfLocalDay } from "@/lib/date";
import { consumePendingNewAction, NEW_ACTION_EVENT } from "@/components/new-action-menu";
import { useFitness } from "@/features/fitness/useFitness";
import { useLocalAuth } from "@/features/auth/auth";
import { fetchWorkoutPost, type FeedPost } from "@/features/feed/feed-api";
import { PostCard } from "@/features/feed/PostCard";
import { formatDistance, formatDuration, timeAgo } from "@/features/feed/format";
import { ManualWorkoutDialog } from "./ManualWorkoutDialog";
import { WeeklyWorkoutChart } from "./WeeklyWorkoutChart";
import { addWorkout, removeWorkout, updateWorkout, type LocalWorkout } from "./workouts-api";
import { getStravaConnection, syncStravaActivities } from "./strava-api";
import { CHANGE_EVENT } from "@/features/fitness/change-event";

function buildStartedAtForSelectedDay(day: Date) {
  const now = new Date();
  const startedAt = new Date(day);
  startedAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return startedAt.toISOString();
}

export function WorkoutsPage() {
  const { workouts, loading } = useFitness();
  const { user } = useLocalAuth();
  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay(new Date()));
  const swipeStartXRef = useRef<number | null>(null);
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedPostOpen, setSelectedPostOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [selectedPostLoading, setSelectedPostLoading] = useState(false);

  useEffect(() => {
    getStravaConnection()
      .then((connection) => {
        if (connection.connected) autoSyncStrava();
      })
      .catch(() => {
        // sem conexao Strava: nada a sincronizar
      });
  }, []);

  useEffect(() => {
    if (consumePendingNewAction("workout")) setAddWorkoutOpen(true);

    function handleNewAction(event: Event) {
      if ((event as CustomEvent).detail === "workout") setAddWorkoutOpen(true);
    }

    window.addEventListener(NEW_ACTION_EVENT, handleNewAction);
    return () => window.removeEventListener(NEW_ACTION_EVENT, handleNewAction);
  }, []);

  const dayWorkouts = useMemo(
    () => workouts.filter((workout) => isSameLocalDate(workout.startedAt, selectedDate)),
    [selectedDate, workouts],
  );

  const workoutTotals = useMemo(
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

  async function handleCreateWorkout(workout: Omit<LocalWorkout, "id">) {
    await addWorkout(workout);
  }

  async function autoSyncStrava() {
    // Reconciliacao rara: o webhook e' a via primaria de sincronizacao; este
    // polling so cobre eventos perdidos, para economizar requisicoes ao Strava.
    const key = "lajesfit-strava-last-sync";
    const last = localStorage.getItem(key);
    const sixHours = 6 * 60 * 60 * 1000;
    if (last && Date.now() - Number(last) < sixHours) return;

    localStorage.setItem(key, String(Date.now()));
    try {
      const result = await syncStravaActivities();
      if (result.imported > 0) {
        window.dispatchEvent(new Event(CHANGE_EVENT));
      }
    } catch {
      // silencioso — sync em background não deve mostrar erros ao usuário
    }
  }

  async function openWorkoutPost(workout: LocalWorkout) {
    if (!user) return;

    setSelectedPost(null);
    setSelectedPostOpen(true);
    setSelectedPostLoading(true);
    try {
      const post = await fetchWorkoutPost(workout.id, user.id);
      if (!post) {
        toast.error("Publicacao deste treino nao encontrada no feed");
        setSelectedPostOpen(false);
        return;
      }
      setSelectedPost(post);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel abrir este treino");
      setSelectedPostOpen(false);
    } finally {
      setSelectedPostLoading(false);
    }
  }

  async function handleRemoveWorkout(id: string) {
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

  return (
    <div
      className="max-w-3xl mx-auto space-y-2"
      onTouchStart={(e) => {
        swipeStartXRef.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = swipeStartXRef.current;
        const end = e.changedTouches[0]?.clientX ?? null;
        swipeStartXRef.current = null;
        if (start === null || end === null) return;
        const delta = end - start;
        if (Math.abs(delta) < 60) return;
        setSelectedDate((d) => addDays(d, delta < 0 ? 1 : -1));
      }}
    >
      <div className="flex items-center justify-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setSelectedDate((date) => addDays(date, -1))}
          aria-label="Ver dia anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-7 rounded-full px-3 text-xs capitalize"
            >
              <CalendarIcon className="mr-1.5 size-3" />
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
            <div className="border-t">
              <WeeklyWorkoutChart workouts={workouts} />
            </div>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setSelectedDate((date) => addDays(date, 1))}
          aria-label="Ver dia posterior"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border bg-card p-2 text-center shadow-card">
          <p className="text-[11px] text-muted-foreground">Treinos</p>
          <p className="font-display text-lg">{workoutTotals.count}</p>
        </div>
        <div className="rounded-lg border bg-card p-2 text-center shadow-card">
          <p className="text-[11px] text-muted-foreground">Tempo</p>
          <p className="font-display text-lg">{formatDuration(workoutTotals.duration)}</p>
        </div>
        <div className="rounded-lg border bg-card p-2 text-center shadow-card">
          <p className="text-[11px] text-muted-foreground">Distancia</p>
          <p className="font-display text-lg">{formatDistance(workoutTotals.distance)}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-card">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-display text-2xl">MEUS TREINOS</h2>
          <ManualWorkoutDialog
            onSaved={handleCreateWorkout}
            open={addWorkoutOpen}
            onOpenChange={setAddWorkoutOpen}
            defaultStartedAt={buildStartedAtForSelectedDay(selectedDate)}
          />
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
              <li
                key={workout.id}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/40 focus-within:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary"
                role="button"
                tabIndex={0}
                onClick={() => void openWorkoutPost(workout)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  void openWorkoutPost(workout);
                }}
              >
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
                  onSaved={(updatedWorkout) => {
                    void updateWorkout(workout.id, updatedWorkout);
                  }}
                  triggerWrapperClassName="shrink-0"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleRemoveWorkout(workout.id);
                  }}
                  onKeyDown={(event) => event.stopPropagation()}
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

      <Dialog open={selectedPostOpen} onOpenChange={setSelectedPostOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:max-w-md">
          {selectedPostLoading ? (
            <div className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              Abrindo treino...
            </div>
          ) : selectedPost ? (
            <PostCard post={selectedPost} currentUserId={user?.id ?? null} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
