import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Flame, ImageIcon, ListPlus, Plus, Trash2, X } from "lucide-react";
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
  addMealWithItems,
  caloriesFromGrams,
  getTacoFoods,
  removeMeal,
  useLocalFitness,
  type MealFoodInput,
  type LocalMeal,
  type TacoFood,
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
  const { meals, loading } = useLocalFitness();

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

  async function handleRemove(id: string) {
    try {
      await removeMeal(id);
      toast.success("Refeicao removida");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel remover a refeicao");
    }
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
              {loading ? (
                <li className="px-4 py-6 text-sm text-muted-foreground text-center">
                  Carregando refeicoes...
                </li>
              ) : items.length === 0 ? (
                <li className="px-4 py-6 text-sm text-muted-foreground text-center">
                  Nenhuma refeicao registrada
                </li>
              ) : (
                items.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
                  >
                    {entry.photoUrl ? (
                      <img
                        src={entry.photoUrl}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <ImageIcon className="size-5" />
                      </div>
                    )}
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
  const [saving, setSaving] = useState(false);
  const [foods, setFoods] = useState<TacoFood[]>([]);
  const [foodsLoading, setFoodsLoading] = useState(false);
  const [foodQuery, setFoodQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<TacoFood | null>(null);
  const [meal, setMeal] = useState<Meal>("lunch");
  const [grams, setGrams] = useState(100);
  const [mealItems, setMealItems] = useState<MealFoodInput[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    if (!open || foods.length > 0) return;

    let mounted = true;
    setFoodsLoading(true);
    getTacoFoods()
      .then((nextFoods) => {
        if (!mounted) return;
        setFoods(nextFoods);
        setSelectedFood((current) => current ?? nextFoods[0] ?? null);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar alimentos");
      })
      .finally(() => {
        if (mounted) setFoodsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [foods.length, open]);

  const filteredFoods = useMemo(() => {
    const query = foodQuery.trim().toLowerCase();
    const matches = query
      ? foods.filter((food) => food.name.toLowerCase().includes(query))
      : foods;
    return matches.slice(0, 12);
  }, [foodQuery, foods]);

  const selected = selectedFood;
  const preview = {
    calories: selected ? caloriesFromGrams(selected.calories, grams) : 0,
    protein: selected ? scale(selected.protein, grams) : 0,
    carbs: selected ? scale(selected.carbs, grams) : 0,
    fat: selected ? scale(selected.fat, grams) : 0,
  };
  const mealTotals = mealItems.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const hasDraft = mealItems.length > 0 || Boolean(photoFile) || pickingPhoto;

  function resetDraft() {
    setGrams(100);
    setFoodQuery("");
    setSelectedFood(foods[0] ?? null);
    setMealItems([]);
    setPickingPhoto(false);
    clearPhoto();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setOpen(true);
      return;
    }

    if (hasDraft) return;
    setOpen(false);
  }

  function cancelMealDraft() {
    resetDraft();
    setOpen(false);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mealItems.length === 0) {
      toast.error("Adicione pelo menos um alimento");
      return;
    }

    setSaving(true);
    try {
      await addMealWithItems({
        meal,
        items: mealItems,
        photoFile,
      });
      toast.success("Refeicao adicionada");
      setOpen(false);
      resetDraft();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a refeicao");
    } finally {
      setSaving(false);
    }
  }

  function addSelectedFood() {
    if (!selected) {
      toast.error("Selecione um alimento");
      return;
    }

    setMealItems((current) => [
      ...current,
      {
        name: selected.name,
        foodId: selected.id,
        grams,
        calories: preview.calories,
        protein: preview.protein,
        carbs: preview.carbs,
        fat: preview.fat,
      },
    ]);
    setFoodQuery("");
    setGrams(100);
  }

  function removeMealItem(index: number) {
    setMealItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    setPickingPhoto(false);
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem valida");
      return;
    }

    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPickingPhoto(false);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="size-4 mr-1" /> Adicionar refeicao
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[92vh] overflow-y-auto sm:max-w-lg"
        onInteractOutside={(event) => {
          if (photoFile || mealItems.length > 0) event.preventDefault();
        }}
      >
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
            <Input
              value={foodQuery}
              onChange={(event) => setFoodQuery(event.target.value)}
              placeholder="Buscar na TACO: arroz, frango, banana..."
            />
            <div className="max-h-52 overflow-y-auto rounded-lg border bg-background">
              {foodsLoading ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Carregando tabela TACO...
                </p>
              ) : filteredFoods.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Nenhum alimento encontrado
                </p>
              ) : (
                filteredFoods.map((food) => {
                  const active = selected?.id === food.id;
                  return (
                    <button
                      key={food.id}
                      type="button"
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted ${
                        active ? "bg-muted font-medium text-primary" : ""
                      }`}
                      onClick={() => {
                        setSelectedFood(food);
                        setFoodQuery(food.name);
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{food.name}</span>
                        {food.category && (
                          <span className="block truncate text-xs font-normal text-muted-foreground">
                            {food.category}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {Math.round(food.calories)} kcal
                      </span>
                    </button>
                  );
                })
              )}
            </div>
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid grid-cols-4 gap-2 text-center bg-muted rounded-lg p-3">
              <Preview label="kcal" value={Math.round(preview.calories)} />
              <Preview label="P" value={preview.protein.toFixed(1)} />
              <Preview label="C" value={preview.carbs.toFixed(1)} />
              <Preview label="G" value={preview.fat.toFixed(1)} />
            </div>
            <Button type="button" onClick={addSelectedFood} disabled={!selected}>
              <ListPlus className="mr-2 size-4" />
              Adicionar alimento
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Itens da refeicao</Label>
            <div className="rounded-lg border bg-background">
              {mealItems.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Nenhum alimento adicionado
                </p>
              ) : (
                <ul className="divide-y">
                  {mealItems.map((item, index) => (
                    <li key={`${item.foodId}-${index}`} className="flex items-center gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.grams}g - {Math.round(item.calories)} kcal
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMealItem(index)}
                        aria-label="Remover alimento"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Foto da refeicao</Label>
            {photoPreview ? (
              <div className="relative overflow-hidden rounded-lg border">
                <img src={photoPreview} alt="" className="h-48 w-full object-cover" />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-2 top-2"
                  onClick={clearPhoto}
                  aria-label="Remover foto"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground">
                <ImageIcon className="size-8" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={pickPhoto}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setPickingPhoto(true);
                  galleryInputRef.current?.click();
                }}
              >
                <ImageIcon className="mr-2 size-4" />
                Galeria
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={pickPhoto}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setPickingPhoto(true);
                  cameraInputRef.current?.click();
                }}
              >
                <Camera className="mr-2 size-4" />
                Camera
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center bg-muted rounded-lg p-3">
            <Preview label="kcal" value={Math.round(mealTotals.calories)} />
            <Preview label="P" value={mealTotals.protein.toFixed(1)} />
            <Preview label="C" value={mealTotals.carbs.toFixed(1)} />
            <Preview label="G" value={mealTotals.fat.toFixed(1)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={cancelMealDraft} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || mealItems.length === 0}>
              {saving ? "Salvando..." : "Salvar refeicao"}
            </Button>
          </div>
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
