import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, formatSelectedDate, isSameLocalDate, startOfLocalDay } from "@/lib/date";
import { consumePendingNewAction, NEW_ACTION_EVENT } from "@/components/new-action-menu";
import { useFitness } from "@/features/fitness/useFitness";
import { AddFoodDialog } from "./AddFoodDialog";
import { MealGroupPhoto } from "./MealGroupPhoto";
import { MEALS, type Meal } from "./constants";
import { groupMealEntries, type MealGroup } from "./meal-grouping";
import { removeMeal } from "./meals-api";
import { WeeklyCalorieChart } from "./WeeklyCalorieChart";

export function DietPage() {
  const { meals, idrProfile, loading } = useFitness();
  const [addMealOpen, setAddMealOpen] = useState(false);
  const [targetMeal, setTargetMeal] = useState<Meal>("lunch");
  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay(new Date()));
  const [swipedEntryId, setSwipedEntryId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<MealGroup | null>(null);
  const [editMealOpen, setEditMealOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (consumePendingNewAction("meal")) {
      setTargetMeal("lunch");
      setAddMealOpen(true);
    }

    function handleNewAction(event: Event) {
      if ((event as CustomEvent).detail === "meal") {
        setTargetMeal("lunch");
        setAddMealOpen(true);
      }
    }

    window.addEventListener(NEW_ACTION_EVENT, handleNewAction);
    return () => window.removeEventListener(NEW_ACTION_EVENT, handleNewAction);
  }, []);

  const dayMeals = useMemo(
    () => meals.filter((meal) => isSameLocalDate(meal.createdAt, selectedDate)),
    [meals, selectedDate],
  );

  const totals = useMemo(() => {
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

  async function handleRemove(id: string) {
    try {
      await removeMeal(id);
      setSwipedEntryId(null);
      toast.success("Refeicao removida");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel remover a refeicao");
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

      <div className="rounded-lg bg-gradient-hero text-primary-foreground p-6 shadow-glow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-primary-foreground/80 text-xs uppercase tracking-widest">
              Resumo das refeicoes
            </p>
            <p className="font-display text-5xl mt-1 flex items-center gap-2">
              <Flame className="size-8" /> {Math.round(totals.kcal)}{" "}
              <span className="text-lg font-sans">kcal</span>
            </p>
          </div>
          <AddFoodDialog
            open={addMealOpen}
            onOpenChange={setAddMealOpen}
            selectedDate={selectedDate}
            meals={meals}
            initialMeal={targetMeal}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Macro label="Proteina" value={totals.p} unit="g" />
          <Macro label="Carboidrato" value={totals.c} unit="g" />
          <Macro label="Gordura" value={totals.g} unit="g" />
        </div>
      </div>

      <WeeklyCalorieChart meals={meals} dailyTarget={idrProfile?.idrCalories ?? 0} />

      {MEALS.map((meal) => {
        const items = dayMeals.filter((entry) => entry.meal === meal.key);
        const groups = groupMealEntries(items);
        const kcal = items.reduce((sum, entry) => sum + entry.calories, 0);
        return (
          <section key={meal.key} className="bg-card rounded-lg border shadow-card overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-display text-2xl">{meal.label.toUpperCase()}</h3>
                <p className="text-xs text-muted-foreground">
                  {Math.round(kcal)} kcal - {groups.length} refeicao(oes) - {items.length} item(ns)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setTargetMeal(meal.key);
                  setAddMealOpen(true);
                }}
              >
                <Plus className="mr-1 size-4" />
                Adicionar
              </Button>
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
                    {group.dietMealId && (
                      <div className="flex justify-end px-4 pt-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingGroup(group);
                            setEditMealOpen(true);
                          }}
                        >
                          <Pencil className="mr-1 size-3.5" />
                          Editar
                        </Button>
                      </div>
                    )}
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
                            if (deltaX > 45 && swipedEntryId === entry.id) setSwipedEntryId(null);
                          }}
                        >
                          <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-destructive">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive-foreground hover:bg-destructive-foreground/15 hover:text-destructive-foreground"
                              onClick={() => handleRemove(entry.id)}
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
    </div>
  );
}

function Macro({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="bg-primary-foreground/10 rounded-lg p-3">
      <p className="text-xs text-primary-foreground/70">{label}</p>
      <p className="font-display text-2xl">
        {value.toFixed(1)}
        <span className="text-sm font-sans ml-1">{unit}</span>
      </p>
    </div>
  );
}
