import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Cookie,
  Flame,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  Soup,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addDays, formatSelectedDate, isSameLocalDate, startOfLocalDay } from "@/lib/date";
import { consumePendingNewAction, NEW_ACTION_EVENT, type NewAction } from "@/components/new-action-menu";
import { useFitness } from "@/features/fitness/useFitness";
import { formatDistance, formatDuration, timeAgo } from "@/features/feed/format";
import { AddFoodDialog } from "@/features/diet/AddFoodDialog";
import { DailySummaryCard } from "@/features/diet/DailySummaryCard";
import { MealGroupPhoto } from "@/features/diet/MealGroupPhoto";
import { MEALS, type Meal } from "@/features/diet/constants";
import { groupMealEntries, type MealGroup } from "@/features/diet/meal-grouping";
import { removeMeal } from "@/features/diet/meals-api";
import { WeeklyCalorieChart } from "@/features/diet/WeeklyCalorieChart";
import { ManualWorkoutDialog } from "@/features/workouts/ManualWorkoutDialog";
import { WeeklyWorkoutChart } from "@/features/workouts/WeeklyWorkoutChart";
import {
  addWorkout,
  removeWorkout,
  updateWorkout,
  type LocalWorkout,
} from "@/features/workouts/workouts-api";
import {
  getStravaAuthorizationUrl,
  getStravaConnection,
  syncStravaActivities,
} from "@/features/workouts/strava-api";

const MEAL_ICONS: Record<Meal, typeof Coffee> = {
  breakfast: Coffee,
  lunch: Soup,
  snack: Cookie,
  dinner: Moon,
};

function buildStartedAtForSelectedDay(day: Date) {
  const now = new Date();
  const startedAt = new Date(day);
  startedAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return startedAt.toISOString();
}

export function DiaryPage() {
  const { meals, workouts, idrProfile, loading } = useFitness();
  const [activeTab, setActiveTab] = useState<"food" | "workouts">("food");
  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay(new Date()));

  const [addMealOpen, setAddMealOpen] = useState(false);
  const [targetMeal, setTargetMeal] = useState<Meal>("lunch");
  const [swipedEntryId, setSwipedEntryId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<MealGroup | null>(null);
  const [editMealOpen, setEditMealOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaBusy, setStravaBusy] = useState(false);

  useEffect(() => {
    function openForAction(action: NewAction) {
      if (action === "meal") {
        setActiveTab("food");
        setTargetMeal("lunch");
        setAddMealOpen(true);
      }
      if (action === "workout") {
        setActiveTab("workouts");
        setAddWorkoutOpen(true);
      }
    }

    if (consumePendingNewAction("meal")) openForAction("meal");
    if (consumePendingNewAction("workout")) openForAction("workout");

    function handleNewAction(event: Event) {
      openForAction((event as CustomEvent<NewAction>).detail);
    }

    window.addEventListener(NEW_ACTION_EVENT, handleNewAction);
    return () => window.removeEventListener(NEW_ACTION_EVENT, handleNewAction);
  }, []);

  useEffect(() => {
    getStravaConnection()
      .then((connection) => setStravaConnected(connection.connected))
      .catch(() => setStravaConnected(false));
  }, []);

  const dayMeals = useMemo(
    () => meals.filter((meal) => isSameLocalDate(meal.createdAt, selectedDate)),
    [meals, selectedDate],
  );

  const dayWorkouts = useMemo(
    () => workouts.filter((workout) => isSameLocalDate(workout.startedAt, selectedDate)),
    [selectedDate, workouts],
  );

  const mealTotals = useMemo(() => {
    return dayMeals.reduce(
      (acc, meal) => ({
        kcal: acc.kcal + meal.calories,
        p: acc.p + meal.protein,
        c: acc.c + meal.carbs,
        g: acc.g + meal.fat,
      }),
      { kcal: 0, p: 0, c: 0, g: 0 },
    );
  }, [dayMeals]);

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

  async function handleRemoveMeal(id: string) {
    try {
      await removeMeal(id);
      setSwipedEntryId(null);
      toast.success("Refeicao removida");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel remover a refeicao");
    }
  }

  async function handleCreateWorkout(workout: Omit<LocalWorkout, "id">) {
    await addWorkout(workout);
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
      const result = await syncStravaActivities();
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
    <div className="max-w-3xl mx-auto space-y-4">
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
            <div className="border-t">
              <WeeklyCalorieChart meals={meals} dailyTarget={idrProfile?.idrCalories ?? 0} />
            </div>
            <div className="border-t">
              <WeeklyWorkoutChart workouts={workouts} />
            </div>
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

      <AddFoodDialog
        open={addMealOpen}
        onOpenChange={setAddMealOpen}
        selectedDate={selectedDate}
        meals={meals}
        initialMeal={targetMeal}
        showTrigger={false}
      />

      <DailySummaryCard
        consumed={mealTotals.kcal}
        target={idrProfile?.idrCalories ?? 0}
        burned={workoutTotals.calories}
        protein={mealTotals.p}
        carbs={mealTotals.c}
        fat={mealTotals.g}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "food" | "workouts")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="food">Alimentacao</TabsTrigger>
          <TabsTrigger value="workouts">Treinos</TabsTrigger>
        </TabsList>

        <TabsContent value="food" className="space-y-4 mt-4">
          {MEALS.map((meal) => {
            const items = dayMeals.filter((entry) => entry.meal === meal.key);
            const groups = groupMealEntries(items);
            const kcal = items.reduce((sum, entry) => sum + entry.calories, 0);
            const MealIcon = MEAL_ICONS[meal.key];
            return (
              <section
                key={meal.key}
                className="bg-card rounded-lg border shadow-card overflow-hidden"
              >
                <header className="flex items-center gap-3 p-4 border-b">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MealIcon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{meal.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(kcal)} kcal · {items.length} item(ns)
                    </p>
                  </div>
                  {items.length === 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-full"
                      aria-label={`Adicionar item em ${meal.label}`}
                      onClick={() => {
                        setTargetMeal(meal.key);
                        setAddMealOpen(true);
                      }}
                    >
                      <Plus className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-full"
                      aria-label={`Editar ${meal.label}`}
                      onClick={() => {
                        const editableGroup = groups.find((g) => g.dietMealId);
                        if (editableGroup) {
                          setEditingGroup(editableGroup);
                          setEditMealOpen(true);
                        }
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                </header>
                <div className="divide-y">
                  {loading ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                      Carregando refeicoes...
                    </div>
                  ) : items.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                      Nenhuma refeicao registrada
                    </div>
                  ) : (
                    groups.map((group) => (
                      <div key={group.id} className="bg-card">
                        <MealGroupPhoto group={group} />
                        <ul className="divide-y border-t">
                          {group.items.map((entry) => (
                            <li
                              key={entry.id}
                              className="relative overflow-hidden bg-card"
                              onTouchStart={(event) => {
                                touchStartXRef.current = event.touches[0]?.clientX ?? null;
                              }}
                              onTouchEnd={(event) => {
                                const startX = touchStartXRef.current;
                                const endX = event.changedTouches[0]?.clientX ?? null;
                                touchStartXRef.current = null;
                                if (startX === null || endX === null) return;
                                const deltaX = endX - startX;
                                if (deltaX < -45) setSwipedEntryId(entry.id);
                                if (deltaX > 45 && swipedEntryId === entry.id) {
                                  setSwipedEntryId(null);
                                }
                              }}
                            >
                              <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-destructive">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive-foreground hover:bg-destructive-foreground/15 hover:text-destructive-foreground"
                                  onClick={() => handleRemoveMeal(entry.id)}
                                  aria-label="Excluir alimento da refeicao"
                                >
                                  <Trash2 className="size-5" />
                                </Button>
                              </div>
                              <div
                                className={`relative z-10 flex items-center gap-3 bg-card px-4 py-3 transition-transform duration-200 hover:bg-muted/40 ${
                                  swipedEntryId === entry.id ? "-translate-x-20" : "translate-x-0"
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{entry.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {entry.grams}g - {entry.protein.toFixed(1)}P /{" "}
                                    {entry.carbs.toFixed(1)}C / {entry.fat.toFixed(1)}G
                                  </p>
                                </div>
                                <p className="font-display text-xl">
                                  {Math.round(entry.calories)}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          })}

          <AddFoodDialog
            open={editMealOpen}
            onOpenChange={(nextOpen) => {
              setEditMealOpen(nextOpen);
              if (!nextOpen) setEditingGroup(null);
            }}
            selectedDate={selectedDate}
            meals={meals}
            editingGroup={editingGroup}
            showTrigger={false}
            disableDraft
          />
        </TabsContent>

        <TabsContent value="workouts" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="bg-[#FC4C02] text-white hover:bg-[#e34402]"
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
                  <Zap className="mr-2 size-4" />
                  {stravaBusy ? "Abrindo..." : "Conectar Strava"}
                </>
              )}
            </Button>
            {stravaConnected && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={connectStrava}
                disabled={stravaBusy}
              >
                Reconectar
              </Button>
            )}
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
                <li className="p-8 text-center text-muted-foreground text-sm">
                  Carregando treinos...
                </li>
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
                    className="px-4 py-3 flex items-center gap-3 hover:bg-muted/40"
                  >
                    {workout.mediaUrl ? (
                      <img
                        src={workout.mediaUrl}
                        alt=""
                        className="size-10 rounded-lg object-cover"
                      />
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
                      {distanceLabel !== "-" && (
                        <p className="font-display text-lg">{distanceLabel}</p>
                      )}
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
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveWorkout(workout.id)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
