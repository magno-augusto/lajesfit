import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Flame, Plus, Trash2 } from "lucide-react";
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
import {
  FOOD_OPTIONS,
  addMeal,
  caloriesFromGrams,
  removeMeal,
  useLocalFitness,
  type LocalMeal,
} from "@/lib/local-fitness";

export const Route = createFileRoute("/_authenticated/diet")({
  head: () => ({ meta: [{ title: "Dieta - Lajes Fit" }] }),
  component: DietPage,
});

type Meal = LocalMeal["meal"];

const MEALS: { key: Meal; label: string }[] = [
  { key: "breakfast", label: "Cafe da manha" },
  { key: "lunch", label: "Almoco" },
  { key: "snack", label: "Lanche" },
  { key: "dinner", label: "Jantar" },
];

function scale(value: number, grams: number) {
  return (value * grams) / 100;
}

function DietPage() {
  const { meals } = useLocalFitness();

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, meal) => ({
        kcal: acc.kcal + meal.calories,
        p: acc.p + meal.protein,
        c: acc.c + meal.carbs,
        g: acc.g + meal.fat,
      }),
      { kcal: 0, p: 0, c: 0, g: 0 },
    );
  }, [meals]);

  function handleRemove(id: string) {
    removeMeal(id);
    toast.success("Refeicao removida");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
          <AddFoodDialog />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Macro label="Proteina" value={totals.p} unit="g" />
          <Macro label="Carboidrato" value={totals.c} unit="g" />
          <Macro label="Gordura" value={totals.g} unit="g" />
        </div>
      </div>

      {MEALS.map((meal) => {
        const items = meals.filter((entry) => entry.meal === meal.key);
        const kcal = items.reduce((sum, entry) => sum + entry.calories, 0);
        return (
          <section key={meal.key} className="bg-card rounded-lg border shadow-card overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-display text-2xl">{meal.label.toUpperCase()}</h3>
                <p className="text-xs text-muted-foreground">
                  {Math.round(kcal)} kcal - {items.length} item(ns)
                </p>
              </div>
            </header>
            <ul className="divide-y">
              {items.length === 0 ? (
                <li className="px-4 py-6 text-sm text-muted-foreground text-center">
                  Nenhuma refeicao registrada
                </li>
              ) : (
                items.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.grams}g - {entry.protein.toFixed(1)}P / {entry.carbs.toFixed(1)}C /{" "}
                        {entry.fat.toFixed(1)}G
                      </p>
                    </div>
                    <p className="font-display text-xl">{Math.round(entry.calories)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(entry.id)}
                      aria-label="Remover refeicao"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </section>
        );
      })}
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

function AddFoodDialog() {
  const [open, setOpen] = useState(false);
  const [foodName, setFoodName] = useState(FOOD_OPTIONS[0].name);
  const [meal, setMeal] = useState<Meal>("lunch");
  const [grams, setGrams] = useState(100);

  const selected = FOOD_OPTIONS.find((food) => food.name === foodName) ?? FOOD_OPTIONS[0];
  const preview = {
    calories: caloriesFromGrams(selected.calories, grams),
    protein: scale(selected.protein, grams),
    carbs: scale(selected.carbs, grams),
    fat: scale(selected.fat, grams),
  };

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    addMeal({
      name: selected.name,
      meal,
      grams,
      calories: preview.calories,
      protein: preview.protein,
      carbs: preview.carbs,
      fat: preview.fat,
    });
    toast.success("Refeicao adicionada");
    setOpen(false);
    setGrams(100);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="size-4 mr-1" /> Adicionar refeicao
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar refeicao</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Refeicao</Label>
            <Select value={meal} onValueChange={(value) => setMeal(value as Meal)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEALS.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Alimento</Label>
            <Select value={foodName} onValueChange={setFoodName}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOOD_OPTIONS.map((food) => (
                  <SelectItem key={food.name} value={food.name}>
                    {food.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meal-grams">Quantidade (g)</Label>
            <Input
              id="meal-grams"
              type="number"
              min="1"
              step="1"
              value={grams}
              onChange={(event) => setGrams(Math.max(1, Number(event.target.value) || 1))}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 text-center bg-muted rounded-lg p-3">
            <Preview label="kcal" value={Math.round(preview.calories)} />
            <Preview label="P" value={preview.protein.toFixed(1)} />
            <Preview label="C" value={preview.carbs.toFixed(1)} />
            <Preview label="G" value={preview.fat.toFixed(1)} />
          </div>
          <Button type="submit" className="w-full">
            Salvar refeicao
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Preview({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl">{value}</p>
    </div>
  );
}
