import { useEffect, useMemo, useState } from "react";

import { Activity, Clock, Flame, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { consumePendingNewAction, NEW_ACTION_EVENT } from "@/components/new-action-menu";
import { useFitness } from "@/features/fitness/useFitness";
import { useLocalAuth } from "@/features/auth/auth";
import { fetchWorkoutPost, type FeedPost } from "@/features/feed/feed-api";
import { PostCard } from "@/features/feed/PostCard";
import { formatDistance, formatDuration, timeAgo } from "@/features/feed/format";
import { ManualWorkoutDialog } from "./ManualWorkoutDialog";
import { addWorkout, removeWorkout, updateWorkout, type LocalWorkout } from "./workouts-api";
import { getStravaConnection, syncStravaActivities } from "./strava-api";
import { CHANGE_EVENT } from "@/features/fitness/change-event";
import poweredByStravaLogo from "@/assets/strava/api_logo_pwrdBy_strava_horiz_orange.svg";

function MonthStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Activity;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-1">
      <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-3.5" />
      </span>
      <p className="font-display text-xl leading-none">{value}</p>
      <p className="text-[11px] leading-none text-muted-foreground">{label}</p>
    </div>
  );
}

export function WorkoutsPage() {
  const { workouts, loading } = useFitness();
  const { user } = useLocalAuth();
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

  // historico completo, da atividade mais nova para a mais antiga
  const history = useMemo(
    () =>
      [...workouts].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      ),
    [workouts],
  );

  const monthTotals = useMemo(() => {
    const now = new Date();
    return history
      .filter((workout) => {
        const startedAt = new Date(workout.startedAt);
        return (
          startedAt.getMonth() === now.getMonth() && startedAt.getFullYear() === now.getFullYear()
        );
      })
      .reduce(
        (acc, workout) => ({
          distance: acc.distance + (workout.distanceMeters ?? 0),
          duration: acc.duration + (workout.durationSeconds ?? 0),
          calories: acc.calories + (workout.calories ?? 0),
          count: acc.count + 1,
        }),
        { distance: 0, duration: 0, calories: 0, count: 0 },
      );
  }, [history]);

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
    <div className="max-w-3xl mx-auto space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">MEUS TREINOS</h1>
        <ManualWorkoutDialog
          onSaved={handleCreateWorkout}
          open={addWorkoutOpen}
          onOpenChange={setAddWorkoutOpen}
          defaultStartedAt={new Date().toISOString()}
        />
      </div>

      <section className="rounded-lg border bg-card p-4 shadow-card">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Este mês
        </p>
        <div className="mt-3 grid grid-cols-4 divide-x divide-border">
          <MonthStat icon={Activity} value={String(monthTotals.count)} label="Treinos" />
          <MonthStat icon={Clock} value={formatDuration(monthTotals.duration)} label="Tempo" />
          <MonthStat icon={MapPin} value={formatDistance(monthTotals.distance)} label="Distância" />
          <MonthStat
            icon={Flame}
            value={String(Math.round(monthTotals.calories))}
            label="Calorias"
          />
        </div>
      </section>

      {loading && (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
          Carregando treinos...
        </div>
      )}
      {!loading && history.length === 0 && (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
          Nenhum treino registrado ainda
        </div>
      )}

      {history.map((workout) => {
        const hasCalories = typeof workout.calories === "number" && workout.calories > 0;
        const durationLabel = formatDuration(workout.durationSeconds);
        const distanceLabel = formatDistance(workout.distanceMeters);
        const startedAt = new Date(workout.startedAt);
        const dateLabel = startedAt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        });
        const timeLabel = startedAt.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <article
            key={workout.id}
            className="cursor-pointer rounded-lg border bg-card p-4 shadow-card hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary"
            role="button"
            tabIndex={0}
            onClick={() => void openWorkoutPost(workout)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              void openWorkoutPost(workout);
            }}
          >
            <div className="flex items-center gap-3">
              {workout.mediaUrl ? (
                <img src={workout.mediaUrl} alt="" className="size-11 rounded-lg object-cover" />
              ) : (
                <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Activity className="size-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {workout.name ?? workout.activityType}
                </p>
                <p className="text-xs text-muted-foreground">
                  {workout.activityType} · {dateLabel} às {timeLabel} · {timeAgo(workout.startedAt)}
                </p>
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
            </div>

            {workout.stravaActivityId && (
              <a
                href={`https://www.strava.com/activities/${workout.stravaActivityId}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                className="mt-1 inline-block text-xs font-semibold text-[#FC5200]"
              >
                View on Strava
              </a>
            )}

            <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
              <div>
                <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="size-3" /> Distância
                </p>
                <p className="font-display text-lg">{distanceLabel}</p>
              </div>
              <div>
                <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="size-3" /> Tempo
                </p>
                <p className="font-display text-lg">{durationLabel}</p>
              </div>
              <div>
                <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                  <Flame className="size-3" /> Calorias
                </p>
                <p className="font-display text-lg">
                  {hasCalories ? Math.round(workout.calories!) : "-"}
                </p>
              </div>
            </div>
          </article>
        );
      })}

      {history.some((workout) => workout.stravaActivityId) && (
        <div className="flex justify-center pb-1 pt-2">
          <img src={poweredByStravaLogo} alt="Powered by Strava" className="h-5 w-auto" />
        </div>
      )}

      <Dialog open={selectedPostOpen} onOpenChange={setSelectedPostOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:max-w-md">
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
