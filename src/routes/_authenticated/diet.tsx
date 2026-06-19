import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  Camera,
  ChevronLeft,
  ChevronRight,
  Flame,
  ImageIcon,
  ListPlus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  cacheFoodInCatalog,
  getFoodCatalog,
  removeMeal,
  searchOpenFoodFactsFoods,
  useLocalFitness,
  type MealFoodInput,
  type LocalMeal,
  type TacoFood,
  type FoodMeasure,
} from "@/lib/local-fitness";
import { consumePendingNewAction, NEW_ACTION_EVENT } from "@/components/new-action-menu";

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

const MEAL_DRAFT_KEY = "lajes-fit-meal-draft";

type MealDraft = {
  meal: Meal;
  grams: number;
  quantity?: number;
  measureId?: string;
  foodQuery: string;
  mealItems: MealFoodInput[];
  photoDataUrl: string | null;
};

function scale(value: number, grams: number) {
  return (value * grams) / 100;
}

function foodSourceLabel(food: TacoFood) {
  const labels: Record<TacoFood["source"], string> = {
    tbca: "TBCA/USP",
    taco: "TACO",
    open_food_facts: "Open Food Facts",
    manual: "Manual",
  };
  return labels[food.source];
}

function normalizeFoodName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function defaultMeasureForFood(food: TacoFood | null) {
  if (!food) return null;
  return food.measures.find((measure) => measure.isDefault) ?? food.measures[0] ?? null;
}

function defaultQuantityForMeasure(measure: FoodMeasure | null) {
  if (!measure) return 100;
  if (measure.unit === "g") return 100;
  if (measure.unit === "ml") return 200;
  return 1;
}

function mealToHistoryFood(meal: LocalMeal, matchingFood?: TacoFood): TacoFood {
  if (matchingFood) return matchingFood;

  const grams = meal.grams > 0 ? meal.grams : 100;
  return {
    id: `history:${normalizeFoodName(meal.name)}`,
    foodId: null,
    source: "manual",
    sourceId: null,
    brand: null,
    name: meal.name,
    category: "Usado anteriormente",
    calories: (meal.calories * 100) / grams,
    protein: (meal.protein * 100) / grams,
    carbs: (meal.carbs * 100) / grams,
    fat: (meal.fat * 100) / grams,
    fiber: 0,
    measures: [{ id: "g", label: "gramas", unit: "g", grams: 1, isDefault: true }],
  };
}

function getHistoryFoods(meals: LocalMeal[], foods: TacoFood[], mode: "popular" | "recent") {
  const foodByName = new Map(foods.map((food) => [normalizeFoodName(food.name), food]));
  const grouped = new Map<
    string,
    { count: number; latestAt: number; meal: LocalMeal; food?: TacoFood }
  >();

  meals.forEach((meal) => {
    const key = normalizeFoodName(meal.name);
    if (!key) return;

    const latestAt = new Date(meal.createdAt).getTime();
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        count: 1,
        latestAt,
        meal,
        food: foodByName.get(key),
      });
      return;
    }

    current.count += 1;
    if (latestAt > current.latestAt) {
      current.latestAt = latestAt;
      current.meal = meal;
      current.food = current.food ?? foodByName.get(key);
    }
  });

  return Array.from(grouped.values())
    .sort((a, b) =>
      mode === "popular" ? b.count - a.count || b.latestAt - a.latestAt : b.latestAt - a.latestAt,
    )
    .slice(0, 12)
    .map((item) => mealToHistoryFood(item.meal, item.food));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Nao foi possivel ler a imagem"));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Nao foi possivel processar a imagem"));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nao foi possivel carregar a imagem"));
    image.src = src;
  });
}

async function compressImageDataUrl(dataUrl: string) {
  const image = await loadImage(dataUrl);
  const maxSize = 1400;
  const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  return blob ? blobToDataUrl(blob) : dataUrl;
}

function isOlderAndroidBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const androidMatch = ua.match(/Android\s(\d+)/i);
  const chromeMatch = ua.match(/Chrome\/(\d+)/i);
  const samsungMatch = ua.match(/SamsungBrowser\/(\d+)/i);

  const androidMajor = androidMatch ? Number(androidMatch[1]) : null;
  const chromeMajor = chromeMatch ? Number(chromeMatch[1]) : null;
  const samsungMajor = samsungMatch ? Number(samsungMatch[1]) : null;

  return Boolean(
    androidMajor !== null &&
      androidMajor <= 8 &&
      ((chromeMajor !== null && chromeMajor < 90) ||
        (samsungMajor !== null && samsungMajor < 14) ||
        chromeMajor === null),
  );
}

function startOfLocalDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return startOfLocalDay(nextDate);
}

function isSameLocalDate(isoDate: string, day: Date) {
  const date = new Date(isoDate);
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

function formatSelectedDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function buildConsumedAtForSelectedDay(day: Date) {
  const now = new Date();
  const consumedAt = new Date(day);
  consumedAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return consumedAt.toISOString();
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}

function DietPage() {
  const { meals, loading } = useLocalFitness();
  const [addMealOpen, setAddMealOpen] = useState(false);
  const [targetMeal, setTargetMeal] = useState<Meal>("lunch");
  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay(new Date()));
  const [swipedEntryId, setSwipedEntryId] = useState<string | null>(null);
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

      {MEALS.map((meal) => {
        const items = dayMeals.filter((entry) => entry.meal === meal.key);
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
                    </div>
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

function AddFoodDialog({
  open: controlledOpen,
  onOpenChange,
  selectedDate,
  meals,
  initialMeal = "lunch",
  showTrigger = true,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedDate: Date;
  meals: LocalMeal[];
  initialMeal?: Meal;
  showTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [foods, setFoods] = useState<TacoFood[]>([]);
  const [foodsLoading, setFoodsLoading] = useState(false);
  const [externalFoods, setExternalFoods] = useState<TacoFood[]>([]);
  const [externalFoodsLoading, setExternalFoodsLoading] = useState(false);
  const [foodQuery, setFoodQuery] = useState("");
  const [foodListOpen, setFoodListOpen] = useState(false);
  const [historyMode, setHistoryMode] = useState<"popular" | "recent">("popular");
  const [selectedFood, setSelectedFood] = useState<TacoFood | null>(null);
  const [meal, setMeal] = useState<Meal>("lunch");
  const [grams, setGrams] = useState(100);
  const [quantity, setQuantity] = useState("100");
  const [measureId, setMeasureId] = useState("g");
  const [mealItems, setMealItems] = useState<MealFoodInput[]>([]);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [preferGallery, setPreferGallery] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const protectDraftRef = useRef(false);
  const open = controlledOpen ?? internalOpen;

  function setOpen(nextOpen: boolean) {
    if (onOpenChange) onOpenChange(nextOpen);
    else setInternalOpen(nextOpen);
  }

  useEffect(() => {
    if (open && mealItems.length === 0) setMeal(initialMeal);
  }, [initialMeal, mealItems.length, open]);

  useEffect(() => {
    setPreferGallery(isOlderAndroidBrowser());
  }, []);

  useEffect(() => {
    try {
      const rawDraft = sessionStorage.getItem(MEAL_DRAFT_KEY);
      if (!rawDraft) return;

      const draft = JSON.parse(rawDraft) as Partial<MealDraft>;
      if (draft.meal && MEALS.some((item) => item.key === draft.meal)) setMeal(draft.meal);
      if (typeof draft.grams === "number" && draft.grams > 0) setGrams(draft.grams);
      if (typeof draft.quantity === "number" && draft.quantity > 0) {
        setQuantity(String(draft.quantity));
      }
      if (typeof draft.measureId === "string") setMeasureId(draft.measureId);
      if (typeof draft.foodQuery === "string") setFoodQuery(draft.foodQuery);
      if (Array.isArray(draft.mealItems)) setMealItems(draft.mealItems);
      if (typeof draft.photoDataUrl === "string") setPhotoDataUrl(draft.photoDataUrl);
      if ((draft.mealItems?.length ?? 0) > 0 || draft.photoDataUrl) {
        protectDraftRef.current = true;
        setOpen(true);
      }
    } catch {
      sessionStorage.removeItem(MEAL_DRAFT_KEY);
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady) return;

    const hasPersistentDraft = mealItems.length > 0 || Boolean(photoDataUrl);
    if (!hasPersistentDraft) {
      sessionStorage.removeItem(MEAL_DRAFT_KEY);
      return;
    }

    const draft: MealDraft = {
      meal,
      grams,
      quantity: Number(quantity) > 0 ? Number(quantity) : undefined,
      measureId,
      foodQuery,
      mealItems,
      photoDataUrl,
    };
    try {
      sessionStorage.setItem(MEAL_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      toast.error("A foto ficou grande demais para manter como rascunho. Tente tirar outra foto.");
    }
  }, [draftReady, foodQuery, grams, meal, mealItems, measureId, photoDataUrl, quantity]);

  useEffect(() => {
    if (!open || foods.length > 0) return;

    let mounted = true;
    setFoodsLoading(true);
    getFoodCatalog()
      .then((nextFoods) => {
        if (!mounted) return;
        const firstFood = nextFoods[0] ?? null;
        setFoods(nextFoods);
        setSelectedFood((current) => current ?? firstFood);
        if (!selectedFood && firstFood) applyDefaultMeasure(firstFood);
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

  useEffect(() => {
    if (!open) return;

    const query = foodQuery.trim();
    if (query.length < 3) {
      setExternalFoods([]);
      setExternalFoodsLoading(false);
      return;
    }

    let mounted = true;
    const timeout = window.setTimeout(() => {
      setExternalFoodsLoading(true);
      searchOpenFoodFactsFoods(query)
        .then((nextFoods) => {
          if (mounted) setExternalFoods(nextFoods);
        })
        .catch(() => {
          if (mounted) setExternalFoods([]);
        })
        .finally(() => {
          if (mounted) setExternalFoodsLoading(false);
        });
    }, 450);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
    };
  }, [foodQuery, open]);

  const filteredFoods = useMemo(() => {
    const query = foodQuery.trim().toLowerCase();
    const localMatches = query
      ? foods.filter((food) => food.name.toLowerCase().includes(query))
      : foods;
    const localResults = localMatches.slice(0, 12);
    const localIds = new Set(localResults.map((food) => food.id));
    const externalResults = externalFoods.filter((food) => !localIds.has(food.id)).slice(0, 8);
    return [...localResults, ...externalResults];
  }, [externalFoods, foodQuery, foods]);

  const historyFoods = useMemo(
    () => getHistoryFoods(meals, foods, historyMode),
    [foods, historyMode, meals],
  );

  const visibleFoods = foodQuery.trim() ? filteredFoods : historyFoods;

  function applyDefaultMeasure(food: TacoFood | null) {
    const nextMeasure = defaultMeasureForFood(food);
    const nextQuantity = defaultQuantityForMeasure(nextMeasure);
    setMeasureId(nextMeasure?.id ?? "g");
    setQuantity(String(nextQuantity));
    setGrams(Math.max(1, Math.round(nextQuantity * (nextMeasure?.grams ?? 1))));
  }

  function selectFood(food: TacoFood) {
    setSelectedFood(food);
    setFoodQuery(food.name);
    setFoodListOpen(false);
    applyDefaultMeasure(food);
  }

  useEffect(() => {
    if (!selectedFood) return;
    const hasMeasure = selectedFood.measures.some((measure) => measure.id === measureId);
    if (!hasMeasure) applyDefaultMeasure(selectedFood);
  }, [measureId, selectedFood]);

  const selected = selectedFood;
  const selectedMeasure =
    selected?.measures.find((measure) => measure.id === measureId) ?? defaultMeasureForFood(selected);
  const parsedQuantity = Number(quantity);
  const hasValidQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  const effectiveGrams = hasValidQuantity
    ? Math.max(1, parsedQuantity * (selectedMeasure?.grams ?? 1))
    : 0;
  const preview = {
    calories: selected ? caloriesFromGrams(selected.calories, effectiveGrams) : 0,
    protein: selected ? scale(selected.protein, effectiveGrams) : 0,
    carbs: selected ? scale(selected.carbs, effectiveGrams) : 0,
    fat: selected ? scale(selected.fat, effectiveGrams) : 0,
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

  const hasDraft = mealItems.length > 0 || Boolean(photoDataUrl) || pickingPhoto || photoLoading;

  function resetDraft() {
    setGrams(100);
    setQuantity("100");
    setMeasureId("g");
    setFoodQuery("");
    setSelectedFood(foods[0] ?? null);
    setMealItems([]);
    setPickingPhoto(false);
    setPhotoLoading(false);
    protectDraftRef.current = false;
    clearPhoto();
    sessionStorage.removeItem(MEAL_DRAFT_KEY);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setOpen(true);
      return;
    }

    if (hasDraft || protectDraftRef.current) return;
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
      const photoBlob = photoDataUrl ? await dataUrlToBlob(photoDataUrl) : null;
      await addMealWithItems({
        meal,
        items: mealItems,
        photoFile: photoBlob,
        consumedAt: buildConsumedAtForSelectedDay(selectedDate),
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
    if (!hasValidQuantity) {
      toast.error("Informe uma quantidade valida");
      return;
    }

    setMealItems((current) => [
      ...current,
      {
        name: selected.name,
        foodId: selected.foodId,
        grams: Math.round(effectiveGrams),
        calories: preview.calories,
        protein: preview.protein,
        carbs: preview.carbs,
        fat: preview.fat,
      },
    ]);
    void cacheFoodInCatalog(selected);
    setFoodQuery("");
    setFoodListOpen(false);
    applyDefaultMeasure(selected);
  }

  function removeMealItem(index: number) {
    setMealItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      setPickingPhoto(false);
      setPhotoLoading(false);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPickingPhoto(false);
      setPhotoLoading(false);
      toast.error("Selecione uma imagem valida");
      return;
    }

    protectDraftRef.current = true;
    setOpen(true);
    setPhotoLoading(true);
    try {
      const rawDataUrl = await readFileAsDataUrl(file);
      const dataUrl = await compressImageDataUrl(rawDataUrl);
      setOpen(true);
      setPhotoDataUrl(dataUrl);
      toast.success("Foto adicionada a refeicao");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar a foto");
    } finally {
      setPickingPhoto(false);
      setPhotoLoading(false);
    }
  }

  function clearPhoto() {
    setPickingPhoto(false);
    setPhotoLoading(false);
    setPhotoDataUrl(null);
  }

  return (
    <>
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={pickPhoto}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture={preferGallery ? undefined : "environment"}
        className="hidden"
        onChange={pickPhoto}
      />
      <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button size="sm" variant="secondary">
            <Plus className="size-4 mr-1" /> Adicionar refeicao
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="max-h-[92vh] overflow-y-auto sm:max-w-lg"
        onInteractOutside={(event) => {
          if (hasDraft || protectDraftRef.current) event.preventDefault();
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
              onFocus={() => setFoodListOpen(true)}
              onClick={() => setFoodListOpen(true)}
              onChange={(event) => {
                setFoodQuery(event.target.value);
                setFoodListOpen(true);
              }}
              placeholder="Buscar alimento: arroz, frango, banana, iogurte..."
            />
            {foodListOpen && (
              <div className="overflow-hidden rounded-lg border bg-background">
                {!foodQuery.trim() && (
                  <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {historyMode === "popular" ? "Mais adicionados" : "Adicionados recentemente"}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        setHistoryMode((current) => (current === "popular" ? "recent" : "popular"))
                      }
                    >
                      {historyMode === "popular" ? "Ver recentes" : "Ver mais usados"}
                    </Button>
                  </div>
                )}
                <div className="max-h-52 overflow-y-auto">
                  {foodsLoading ? (
                    <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                      Carregando base de alimentos...
                    </p>
                  ) : visibleFoods.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                      {foodQuery.trim() && externalFoodsLoading
                        ? "Buscando produtos industrializados..."
                        : foodQuery.trim()
                          ? "Nenhum alimento encontrado"
                          : "Nenhum alimento usado ainda"}
                    </p>
                  ) : (
                    <>
                      {visibleFoods.map((food) => {
                        const active = selected?.id === food.id;
                        return (
                          <button
                            key={food.id}
                            type="button"
                            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted ${
                              active ? "bg-muted font-medium text-primary" : ""
                            }`}
                            onClick={() => {
                              selectFood(food);
                            }}
                          >
                            <span className="min-w-0">
                              <span className="block truncate">{food.name}</span>
                              {food.category && (
                                <span className="block truncate text-xs font-normal text-muted-foreground">
                                  {food.category}
                                  {food.brand ? ` - ${food.brand}` : ""}
                                </span>
                              )}
                              <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {foodSourceLabel(food)}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {Math.round(food.calories)} kcal
                            </span>
                          </button>
                        );
                      })}
                      {foodQuery.trim() && externalFoodsLoading && (
                        <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                          Buscando produtos industrializados...
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(9rem,auto)] gap-2">
              <Input
                id="meal-quantity"
                type="number"
                min="0.1"
                step="0.1"
                value={quantity}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const nextQuantity = Number(nextValue);
                  setQuantity(nextValue);
                  if (Number.isFinite(nextQuantity) && nextQuantity > 0) {
                    setGrams(Math.max(1, Math.round(nextQuantity * (selectedMeasure?.grams ?? 1))));
                  }
                }}
              />
              <Select
                value={selectedMeasure?.id ?? measureId}
                onValueChange={(value) => {
                  const nextMeasure = selected?.measures.find((measure) => measure.id === value);
                  const nextQuantity = defaultQuantityForMeasure(nextMeasure ?? null);
                  setMeasureId(value);
                  setQuantity(String(nextQuantity));
                  setGrams(
                    Math.max(
                      1,
                      Math.round(nextQuantity * (nextMeasure?.grams ?? 1)),
                    ),
                  );
                }}
                disabled={!selected}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(selected?.measures ?? [{ id: "g", label: "gramas", unit: "g", grams: 1 }]).map(
                    (measure) => (
                      <SelectItem key={measure.id} value={measure.id}>
                        {measure.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Equivale a {Math.round(effectiveGrams)}g para o calculo nutricional.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid grid-cols-4 gap-2 text-center bg-muted rounded-lg p-3">
              <Preview label="kcal" value={Math.round(preview.calories)} />
              <Preview label="P" value={preview.protein.toFixed(1)} />
              <Preview label="C" value={preview.carbs.toFixed(1)} />
              <Preview label="G" value={preview.fat.toFixed(1)} />
            </div>
            <Button type="button" onClick={addSelectedFood} disabled={!selected || !hasValidQuantity}>
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
            {preferGallery && !photoDataUrl && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Neste aparelho, tire a foto pela camera do celular e depois escolha em Galeria.
              </div>
            )}
            {photoDataUrl ? (
              <div className="relative overflow-hidden rounded-lg border">
                <img src={photoDataUrl} alt="" className="h-48 w-full object-cover" />
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
            ) : photoLoading || pickingPhoto ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed bg-muted/40 text-sm text-muted-foreground">
                Processando foto...
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground">
                <ImageIcon className="size-8" />
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={preferGallery ? "default" : "outline"}
                className="w-full"
                onClick={() => {
                  protectDraftRef.current = true;
                  setPickingPhoto(true);
                  galleryInputRef.current?.click();
                }}
              >
                <ImageIcon className="mr-2 size-4" />
                Galeria
              </Button>
              {!preferGallery && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    protectDraftRef.current = true;
                    setPickingPhoto(true);
                    cameraInputRef.current?.click();
                  }}
                >
                  <Camera className="mr-2 size-4" />
                  Camera
                </Button>
              )}
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
    </>
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
