import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Cookie,
  Moon,
  Pencil,
  Plus,
  Soup,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, formatSelectedDate, isSameLocalDate, startOfLocalDay } from "@/lib/date";
import {
  consumePendingNewAction,
  NEW_ACTION_EVENT,
  type NewAction,
} from "@/components/new-action-menu";
import { useFitness } from "@/features/fitness/useFitness";
import { AddFoodDialog } from "@/features/diet/AddFoodDialog";
import { DailySummaryCard } from "@/features/diet/DailySummaryCard";
import { MEALS, type Meal } from "@/features/diet/constants";
import { groupMealEntries, type MealGroup } from "@/features/diet/meal-grouping";
import { removeMeal, type LocalMeal } from "@/features/diet/meals-api";
import { WeeklyCalorieChart } from "@/features/diet/WeeklyCalorieChart";
import { WeeklyWorkoutChart } from "@/features/workouts/WeeklyWorkoutChart";

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
  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay(new Date()));

  const [savedMeals, setSavedMeals] = useState<LocalMeal[]>([]);
  const [addMealOpen, setAddMealOpen] = useState(false);
  const [targetMeal, setTargetMeal] = useState<Meal>("lunch");
  const [swipedEntryId, setSwipedEntryId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<MealGroup | null>(null);
  const [editMealOpen, setEditMealOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const touchStartXRef = useRef<number | null>(null);
  const swipeStartXRef = useRef<number | null>(null);

  const workoutTotals = useMemo(
    () =>
      workouts
        .filter((w) => isSameLocalDate(w.startedAt, selectedDate))
        .reduce((acc, w) => acc + (w.calories ?? 0), 0),
    [workouts, selectedDate],
  );

  useEffect(() => {
    if (savedMeals.length === 0) return;
    const loadedIds = new Set(meals.map((meal) => meal.id));
    setSavedMeals((current) => current.filter((meal) => !loadedIds.has(meal.id)));
  }, [meals, savedMeals.length]);

  const visibleMeals = useMemo(() => {
    const byId = new Map(meals.map((meal) => [meal.id, meal]));
    savedMeals.forEach((meal) => {
      if (!byId.has(meal.id)) byId.set(meal.id, meal);
    });
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [meals, savedMeals]);

  useEffect(() => {
    if (consumePendingNewAction("meal")) {
      setTargetMeal("lunch");
      setAddMealOpen(true);
    }

    function handleNewAction(event: Event) {
      if ((event as CustomEvent<NewAction>).detail === "meal") {
        setTargetMeal("lunch");
        setAddMealOpen(true);
      }
    }

    window.addEventListener(NEW_ACTION_EVENT, handleNewAction);
    return () => window.removeEventListener(NEW_ACTION_EVENT, handleNewAction);
  }, []);

  const dayMeals = useMemo(
    () => visibleMeals.filter((meal) => isSameLocalDate(meal.createdAt, selectedDate)),
    [selectedDate, visibleMeals],
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

  async function handleRemoveMeal(id: string) {
    try {
      await removeMeal(id);
      setSavedMeals((current) => current.filter((meal) => meal.id !== id));
      setSwipedEntryId(null);
      toast.success("Refeicao removida");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel remover a refeicao");
    }
  }

  return (
    <div
      className="max-w-3xl mx-auto -mt-3"
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
              <WeeklyCalorieChart meals={visibleMeals} dailyTarget={idrProfile?.idrCalories ?? 0} />
            </div>
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

      <AddFoodDialog
        open={addMealOpen}
        onOpenChange={setAddMealOpen}
        selectedDate={selectedDate}
        meals={visibleMeals}
        initialMeal={targetMeal}
        showTrigger={false}
        onSaved={(nextMeals) =>
          setSavedMeals((current) => {
            const byId = new Map(current.map((meal) => [meal.id, meal]));
            nextMeals.forEach((meal) => byId.set(meal.id, meal));
            return Array.from(byId.values());
          })
        }
      />

      <DailySummaryCard
        consumed={mealTotals.kcal}
        target={idrProfile?.idrCalories ?? 0}
        burned={workoutTotals}
        protein={mealTotals.p}
        carbs={mealTotals.c}
        fat={mealTotals.g}
      />

      <div className="space-y-2 mt-2">
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
                {groups.find((g) => g.photoUrl) ? (
                  <button
                    type="button"
                    className="shrink-0"
                    onClick={() => setLightboxUrl(groups.find((g) => g.photoUrl)!.photoUrl!)}
                  >
                    <img
                      src={groups.find((g) => g.photoUrl)!.photoUrl!}
                      alt=""
                      className="size-10 rounded-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MealIcon className="size-5" />
                  </div>
                )}
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    if (items.length === 0) {
                      setTargetMeal(meal.key);
                      setAddMealOpen(true);
                      return;
                    }
                    setExpandedMeals((prev) => {
                      const next = new Set(prev);
                      if (next.has(meal.key)) {
                        next.delete(meal.key);
                      } else {
                        next.add(meal.key);
                      }
                      return next;
                    });
                  }}
                >
                  <h3 className="font-medium">{meal.label}</h3>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(kcal)} kcal · {items.length} item(ns)
                  </p>
                </button>
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
                      const firstGroup = groups[0];
                      if (firstGroup) {
                        setEditingGroup(firstGroup);
                        setEditMealOpen(true);
                      }
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
              </header>
              {expandedMeals.has(meal.key) && items.length > 0 && (
                <div className="divide-y">
                  {loading ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                      Carregando refeicoes...
                    </div>
                  ) : (
                    groups.map((group, groupIndex) => (
                      <div key={group.id} className="bg-card">
                        {groups.length > 1 && (
                          <div className="flex items-center justify-between bg-muted/30 px-4 py-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground">
                              Registro {groupIndex + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => {
                                setEditingGroup(group);
                                setEditMealOpen(true);
                              }}
                            >
                              <Pencil className="mr-1 size-3" /> Editar
                            </Button>
                          </div>
                        )}
                        <ul className="divide-y">
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
                                <p className="font-display text-xl">{Math.round(entry.calories)}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          );
        })}

        <Dialog
          open={Boolean(lightboxUrl)}
          onOpenChange={(open) => {
            if (!open) setLightboxUrl(null);
          }}
        >
          <DialogContent className="max-w-screen-sm border-0 bg-transparent p-0 shadow-none">
            {lightboxUrl && (
              <img
                src={lightboxUrl}
                alt=""
                className="w-full rounded-lg object-contain max-h-[80dvh]"
              />
            )}
          </DialogContent>
        </Dialog>

        <AddFoodDialog
          open={editMealOpen}
          onOpenChange={(nextOpen) => {
            setEditMealOpen(nextOpen);
            if (!nextOpen) setEditingGroup(null);
          }}
          selectedDate={selectedDate}
          meals={visibleMeals}
          editingGroup={editingGroup}
          showTrigger={false}
          disableDraft
        />
      </div>
    </div>
  );
}
