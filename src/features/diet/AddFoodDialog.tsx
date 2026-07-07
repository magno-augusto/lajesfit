import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ImageIcon, ListPlus, Pencil, Plus, ScanBarcode, Trash2, X } from "lucide-react";
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
import { MEALS, type Meal } from "./constants";
import {
  cacheFoodInCatalog,
  caloriesFromGrams,
  defaultMeasureForFood,
  defaultQuantityForMeasure,
  formatFoodName,
  getFoodCatalog,
  normalizeFoodSearch,
  requestFoodSuggestion,
  searchFoods,
  searchOpenFoodFactsFoods,
  type FoodMeasure,
  type TacoFood,
} from "./food-catalog";
import {
  addMealWithItems,
  replaceLegacyMealEntries,
  updateMealItems,
  type LocalMeal,
  type MealFoodInput,
} from "./meals-api";
import { BarcodeScannerDialog } from "./BarcodeScannerDialog";
import type { MealGroup } from "./meal-grouping";
import { compressImageDataUrl, dataUrlToBlob, readFileAsDataUrl } from "./image-utils";

const MEAL_DRAFT_KEY = "lajesfit-meal-draft";

type MealDraft = {
  meal: Meal;
  grams: number;
  quantity?: number;
  measureId?: string;
  foodQuery: string;
  mealItems: MealFoodInput[];
  photoDataUrl: string | null;
  // seletor de foto aberto: o Android pode matar o app enquanto a camera esta
  // em uso, e este flag garante que a tela de refeicao reabra apos o reload
  pendingPhoto?: boolean;
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
    estimated: "Estimado",
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
    aliases: [],
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

function buildConsumedAtForSelectedDay(day: Date) {
  const now = new Date();
  const consumedAt = new Date(day);
  consumedAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return consumedAt.toISOString();
}

export function AddFoodDialog({
  open: controlledOpen,
  onOpenChange,
  selectedDate,
  meals,
  initialMeal = "lunch",
  showTrigger = true,
  editingGroup = null,
  disableDraft = false,
  onSaved,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedDate: Date;
  meals: LocalMeal[];
  initialMeal?: Meal;
  showTrigger?: boolean;
  editingGroup?: MealGroup | null;
  disableDraft?: boolean;
  onSaved?: (meals: LocalMeal[]) => void;
}) {
  const isEditing = Boolean(editingGroup);
  const [internalOpen, setInternalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [foods, setFoods] = useState<TacoFood[]>([]);
  const [foodsLoading, setFoodsLoading] = useState(false);
  const [foodRequestSending, setFoodRequestSending] = useState(false);
  const [submittedFoodRequests, setSubmittedFoodRequests] = useState<Set<string>>(() => new Set());
  const [offFoods, setOffFoods] = useState<TacoFood[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [foodQuery, setFoodQuery] = useState("");
  const [foodListOpen, setFoodListOpen] = useState(false);
  const [historyMode, setHistoryMode] = useState<"popular" | "recent">("popular");
  const [selectedFood, setSelectedFood] = useState<TacoFood | null>(null);
  const [meal, setMeal] = useState<Meal>("lunch");
  const [grams, setGrams] = useState(100);
  const [quantity, setQuantity] = useState("100");
  const [measureId, setMeasureId] = useState("g");
  const [mealItems, setMealItems] = useState<MealFoodInput[]>([]);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingItemGrams, setEditingItemGrams] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const foodSearchSectionRef = useRef<HTMLDivElement | null>(null);
  const photoCancelResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const protectDraftRef = useRef(false);
  const open = controlledOpen ?? internalOpen;

  function setOpen(nextOpen: boolean) {
    if (onOpenChange) onOpenChange(nextOpen);
    else setInternalOpen(nextOpen);
  }

  useEffect(() => {
    if (open && !editingGroup && mealItems.length === 0) setMeal(initialMeal);
  }, [editingGroup, initialMeal, mealItems.length, open]);

  useEffect(() => {
    // lista de alimentos so aparece depois que o usuario toca na busca
    if (open) setFoodListOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open || !editingGroup) return;
    setMeal(editingGroup.meal);
    setMealItems(
      editingGroup.items.map((item) => ({
        name: item.name,
        foodId: item.foodId,
        grams: item.grams,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      })),
    );
  }, [editingGroup, open]);

  useEffect(() => {
    if (disableDraft) {
      setDraftReady(true);
      return;
    }
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
      if ((draft.mealItems?.length ?? 0) > 0 || draft.photoDataUrl || draft.pendingPhoto) {
        protectDraftRef.current = true;
        setOpen(true);
      }
      if (draft.pendingPhoto && !draft.photoDataUrl) {
        // o sistema encerrou o app com a camera aberta: a foto se perdeu
        toast.error("Nao foi possivel manter a foto. Adicione a foto novamente.");
      }
    } catch {
      sessionStorage.removeItem(MEAL_DRAFT_KEY);
    } finally {
      setDraftReady(true);
    }
  }, []);

  const buildDraft = useCallback(
    (pendingPhoto: boolean): MealDraft => ({
      meal,
      grams,
      quantity: Number(quantity) > 0 ? Number(quantity) : undefined,
      measureId,
      foodQuery,
      mealItems,
      photoDataUrl,
      pendingPhoto,
    }),
    [foodQuery, grams, meal, mealItems, measureId, photoDataUrl, quantity],
  );

  useEffect(() => {
    if (!draftReady || disableDraft) return;

    const hasPersistentDraft = mealItems.length > 0 || Boolean(photoDataUrl) || pickingPhoto;
    if (!hasPersistentDraft) {
      sessionStorage.removeItem(MEAL_DRAFT_KEY);
      return;
    }

    try {
      sessionStorage.setItem(MEAL_DRAFT_KEY, JSON.stringify(buildDraft(pickingPhoto)));
    } catch {
      toast.error("A foto ficou grande demais para manter como rascunho. Tente tirar outra foto.");
    }
  }, [buildDraft, disableDraft, draftReady, mealItems.length, photoDataUrl, pickingPhoto]);

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
    const query = foodQuery.trim();
    if (query.length < 2) {
      setOffFoods([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setOffLoading(true);
      try {
        // Busca server-side no banco (TACO + TBCA + catalogo)
        const dbResults = await searchFoods(query);
        if (!cancelled) setOffFoods(dbResults);

        // Complementa com o OFF em tempo real quando o banco trouxe poucos
        // resultados (produtos industrializados vendidos no Brasil)
        if (!cancelled && dbResults.length < 5 && query.length >= 3) {
          const offResults = await searchOpenFoodFactsFoods(query);
          if (!cancelled && offResults.length > 0) {
            const seen = new Set(dbResults.map((food) => food.id));
            setOffFoods([...dbResults, ...offResults.filter((food) => !seen.has(food.id))]);
          }
        }
      } catch {
        if (!cancelled) setOffFoods([]);
      } finally {
        if (!cancelled) setOffLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [foodQuery]);

  const historyFoods = useMemo(
    () => getHistoryFoods(meals, foods, historyMode),
    [foods, historyMode, meals],
  );

  const visibleFoods = foodQuery.trim() ? offFoods : historyFoods;

  const normalizedFoodRequest = normalizeFoodSearch(foodQuery);
  const canSuggestFood =
    normalizedFoodRequest.length >= 2 &&
    visibleFoods.length === 0 &&
    !offLoading &&
    !submittedFoodRequests.has(normalizedFoodRequest);

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

  function openFoodSearch() {
    setFoodListOpen(true);
    window.setTimeout(() => {
      foodSearchSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  useEffect(() => {
    if (!selectedFood) return;
    const hasMeasure = selectedFood.measures.some((measure) => measure.id === measureId);
    if (!hasMeasure) applyDefaultMeasure(selectedFood);
  }, [measureId, selectedFood]);

  const selected = selectedFood;
  const selectedMeasure =
    selected?.measures.find((measure) => measure.id === measureId) ??
    defaultMeasureForFood(selected);
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
    if (!disableDraft) sessionStorage.removeItem(MEAL_DRAFT_KEY);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setOpen(true);
      return;
    }

    if (scannerOpen) return;
    if (!isEditing && (hasDraft || protectDraftRef.current)) return;
    setOpen(false);
  }

  function openBarcodeScanner() {
    protectDraftRef.current = true;
    setOpen(true);
    setScannerOpen(true);
  }

  function closeBarcodeScanner() {
    setScannerOpen(false);
    setOpen(true);
  }

  function cancelMealDraft() {
    resetDraft();
    setOpen(false);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // ao adicionar, a refeicao pode ser salva sem alimentos (ex.: so a foto);
    // na edicao os itens substituem os atuais, entao pelo menos um e' preciso
    if (isEditing && mealItems.length === 0) {
      toast.error("Adicione pelo menos um alimento");
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editingGroup) {
        if (editingGroup.dietMealId) {
          await updateMealItems(editingGroup.dietMealId, mealItems, meal);
        } else {
          await replaceLegacyMealEntries({
            entryIds: editingGroup.items.map((item) => item.id),
            meal,
            consumedAt: editingGroup.items[0]?.createdAt ?? new Date().toISOString(),
            items: mealItems,
          });
        }
        toast.success("Refeicao atualizada");
      } else {
        const photoBlob = photoDataUrl ? await dataUrlToBlob(photoDataUrl) : null;
        const savedMeals = await addMealWithItems({
          meal,
          items: mealItems,
          photoFile: photoBlob,
          consumedAt: buildConsumedAtForSelectedDay(selectedDate),
        });
        onSaved?.(savedMeals);
        toast.success("Refeicao adicionada");
      }
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
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setEditingItemGrams("");
    }
  }

  function startEditItem(index: number) {
    setEditingItemIndex(index);
    setEditingItemGrams(String(mealItems[index].grams));
  }

  function cancelEditItem() {
    setEditingItemIndex(null);
    setEditingItemGrams("");
  }

  function confirmEditItem() {
    if (editingItemIndex === null) return;
    const nextGrams = Number(editingItemGrams);
    if (!Number.isFinite(nextGrams) || nextGrams <= 0) {
      toast.error("Informe uma quantidade valida");
      return;
    }

    setMealItems((current) =>
      current.map((item, index) => {
        if (index !== editingItemIndex) return item;
        const ratio = nextGrams / item.grams;
        return {
          ...item,
          grams: Math.round(nextGrams),
          calories: item.calories * ratio,
          protein: item.protein * ratio,
          carbs: item.carbs * ratio,
          fat: item.fat * ratio,
        };
      }),
    );
    setEditingItemIndex(null);
    setEditingItemGrams("");
  }

  function resetManualForm() {
    setShowManualForm(false);
    setManualName("");
    setManualBrand("");
    setManualCalories("");
    setManualProtein("");
    setManualCarbs("");
    setManualFat("");
  }

  async function submitManualFood(e?: React.FormEvent) {
    e?.preventDefault();
    const kcal = Number(manualCalories);
    if (!manualName.trim() || !Number.isFinite(kcal) || kcal <= 0) {
      toast.error("Informe nome e calorias para cadastrar o alimento");
      return;
    }
    const id = `manual:${crypto.randomUUID()}`;
    const food: TacoFood = {
      id,
      foodId: null,
      source: "manual",
      sourceId: id,
      name: manualName.trim(),
      brand: manualBrand.trim() || null,
      category: null,
      calories: kcal,
      protein: Number(manualProtein) || 0,
      carbs: Number(manualCarbs) || 0,
      fat: Number(manualFat) || 0,
      fiber: 0,
      aliases: [],
      measures: [{ id: "g", label: "gramas", unit: "g", grams: 1, isDefault: true }],
    };
    void cacheFoodInCatalog(food);
    selectFood(food);
    resetManualForm();
    setFoodListOpen(false);
  }

  async function submitFoodRequest() {
    if (!canSuggestFood) return;

    setFoodRequestSending(true);
    try {
      const result = await requestFoodSuggestion(foodQuery);
      setSubmittedFoodRequests((current) => new Set(current).add(normalizedFoodRequest));
      toast.success(
        result.alreadyExists
          ? "Essa sugestao ja foi enviada."
          : "Sugestao enviada. Vamos analisar esse alimento para incluir na base.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel enviar a sugestao");
    } finally {
      setFoodRequestSending(false);
    }
  }

  function clearPhotoCancelReset() {
    if (!photoCancelResetRef.current) return;
    clearTimeout(photoCancelResetRef.current);
    photoCancelResetRef.current = null;
  }

  useEffect(() => clearPhotoCancelReset, []);

  function openPhotoPicker() {
    protectDraftRef.current = true;
    setPickingPhoto(true);

    // grava o rascunho de forma sincrona antes de abrir a camera: se o Android
    // encerrar o app durante a captura, o reload reabre esta tela
    if (!disableDraft) {
      try {
        sessionStorage.setItem(MEAL_DRAFT_KEY, JSON.stringify(buildDraft(true)));
      } catch {
        // melhor esforco: sem rascunho, o fluxo normal segue funcionando
      }
    }

    const input = galleryInputRef.current;
    if (!input) {
      setPickingPhoto(false);
      return;
    }

    const resetIfCancelled = () => {
      clearPhotoCancelReset();
      photoCancelResetRef.current = setTimeout(() => {
        if (input.files && input.files.length > 0) return;
        setPickingPhoto(false);
        setPhotoLoading(false);
      }, 300);
    };

    window.addEventListener("focus", resetIfCancelled, { once: true });
    input.click();
  }

  async function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    clearPhotoCancelReset();
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
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {showTrigger && (
          <DialogTrigger asChild>
            <Button size="sm" variant="secondary">
              <Plus className="size-4 mr-1" /> Adicionar refeicao
            </Button>
          </DialogTrigger>
        )}
        <DialogContent
          className="inset-0 h-full max-h-full w-full max-w-full translate-x-0 translate-y-0 overflow-x-hidden overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-none sm:p-6"
          onOpenAutoFocus={(event) => {
            // O autofoco na busca abria a lista de alimentos e o teclado do
            // celular sozinhos; a lista deve aparecer so ao tocar no campo.
            event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (scannerOpen) event.preventDefault();
            if (!isEditing && (hasDraft || protectDraftRef.current)) event.preventDefault();
          }}
        >
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={pickPhoto}
          />
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar refeicao" : "Adicionar refeicao"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className={isEditing ? "hidden" : "space-y-2"}>
              <Label>Foto da refeicao</Label>
              {photoDataUrl ? (
                <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/40 text-muted-foreground">
                  <img src={photoDataUrl} alt="" className="h-full w-full object-cover" />
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
              ) : null}
              <Button type="button" variant="outline" className="w-full" onClick={openPhotoPicker}>
                <ImageIcon className="mr-2 size-4" />
                {photoDataUrl ? "Trocar foto" : "Adicionar foto"}
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Refeicao</Label>
              <Select
                value={meal}
                onValueChange={(value) => setMeal(value as Meal)}
                disabled={isEditing}
              >
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
            <div ref={foodSearchSectionRef} className="scroll-mt-4 space-y-2">
              <Label>Alimento</Label>
              <div className="flex gap-2">
                <Input
                  className="min-w-0 flex-1"
                  value={foodQuery}
                  onFocus={openFoodSearch}
                  onClick={openFoodSearch}
                  onBlur={() => {
                    // espera o clique num item da lista concluir antes de
                    // fechar (blur dispara antes do click no mobile)
                    window.setTimeout(() => {
                      const section = foodSearchSectionRef.current;
                      if (section && section.contains(document.activeElement)) return;
                      setFoodListOpen(false);
                    }, 250);
                  }}
                  onChange={(event) => {
                    setFoodQuery(event.target.value);
                    setFoodListOpen(true);
                  }}
                  placeholder="Buscar alimento"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={openBarcodeScanner}
                  aria-label="Escanear código de barras"
                >
                  <ScanBarcode className="size-4" />
                </Button>
              </div>
              {foodListOpen && (
                <div className="overflow-hidden rounded-lg border bg-background">
                  {!foodQuery.trim() && (
                    <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={`h-7 flex-1 rounded-full px-2 text-xs ${
                          historyMode === "popular"
                            ? "bg-primary/10 font-semibold text-primary hover:bg-primary/15 hover:text-primary"
                            : "text-muted-foreground"
                        }`}
                        onClick={() => setHistoryMode("popular")}
                      >
                        Mais adicionados
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={`h-7 flex-1 rounded-full px-2 text-xs ${
                          historyMode === "recent"
                            ? "bg-primary/10 font-semibold text-primary hover:bg-primary/15 hover:text-primary"
                            : "text-muted-foreground"
                        }`}
                        onClick={() => setHistoryMode("recent")}
                      >
                        Adicionados recentemente
                      </Button>
                    </div>
                  )}
                  <div className="max-h-[60dvh] overflow-y-auto">
                    {foodsLoading ? (
                      <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                        Carregando base de alimentos...
                      </p>
                    ) : visibleFoods.length === 0 && offLoading ? (
                      <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                        Buscando...
                      </p>
                    ) : visibleFoods.length === 0 ? (
                      <div className="space-y-3 px-3 py-4">
                        {!foodQuery.trim() ? (
                          <p className="text-center text-sm text-muted-foreground">
                            Nenhum alimento usado ainda
                          </p>
                        ) : showManualForm ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Cadastrar alimento
                            </p>
                            <Input
                              placeholder="Nome do alimento *"
                              value={manualName}
                              onChange={(e) => setManualName(e.target.value)}
                              autoFocus
                              required
                            />
                            <Input
                              placeholder="Marca (opcional)"
                              value={manualBrand}
                              onChange={(e) => setManualBrand(e.target.value)}
                            />
                            <p className="text-[11px] text-muted-foreground">Valores por 100g</p>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                min="1"
                                placeholder="Calorias (kcal) *"
                                value={manualCalories}
                                onChange={(e) => setManualCalories(e.target.value)}
                                required
                              />
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="Proteína (g)"
                                value={manualProtein}
                                onChange={(e) => setManualProtein(e.target.value)}
                              />
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="Carboidrato (g)"
                                value={manualCarbs}
                                onChange={(e) => setManualCarbs(e.target.value)}
                              />
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="Gordura (g)"
                                value={manualFat}
                                onChange={(e) => setManualFat(e.target.value)}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="flex-1"
                                onClick={() => void submitManualFood()}
                              >
                                Salvar alimento
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={resetManualForm}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 text-center">
                            <p className="text-sm text-muted-foreground">
                              Nao encontramos esse alimento.
                            </p>
                            <div className="flex flex-col gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setManualName(foodQuery);
                                  setShowManualForm(true);
                                }}
                              >
                                Cadastrar alimento
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
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
                              <span className="min-w-0 flex-1">
                                <span className="block truncate">{formatFoodName(food.name)}</span>
                                {(food.category || food.brand) && (
                                  <span className="block truncate text-xs font-normal text-muted-foreground">
                                    {[food.brand, food.category].filter(Boolean).join(" · ")}
                                  </span>
                                )}
                                <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {foodSourceLabel(food)}
                                </span>
                              </span>
                              <span className="shrink-0 text-right">
                                <span className="block text-sm font-medium">
                                  {Math.round(food.calories)} kcal
                                </span>
                                <span className="block text-[10px] text-muted-foreground">
                                  por 100 g
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </>
                    )}
                    {offLoading && visibleFoods.length > 0 && (
                      <p className="px-3 py-2 text-center text-[10px] text-muted-foreground">
                        Buscando mais...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)] gap-2">
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
                      setGrams(
                        Math.max(1, Math.round(nextQuantity * (selectedMeasure?.grams ?? 1))),
                      );
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
                    setGrams(Math.max(1, Math.round(nextQuantity * (nextMeasure?.grams ?? 1))));
                  }}
                  disabled={!selected}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      selected?.measures ?? [
                        { id: "g", label: "gramas", unit: "g", grams: 1 } as FoodMeasure,
                      ]
                    ).map((measure) => (
                      <SelectItem key={measure.id} value={measure.id}>
                        {measure.label}
                      </SelectItem>
                    ))}
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
              <Button
                type="button"
                onClick={addSelectedFood}
                disabled={!selected || !hasValidQuantity}
              >
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
                    {mealItems.map((item, index) =>
                      editingItemIndex === index ? (
                        <li
                          key={`${item.foodId}-${index}`}
                          className="flex items-center gap-2 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{item.name}</p>
                            <Input
                              type="number"
                              min="0.1"
                              step="0.1"
                              autoFocus
                              value={editingItemGrams}
                              onChange={(event) => setEditingItemGrams(event.target.value)}
                              className="mt-1 h-8"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={confirmEditItem}
                            aria-label="Confirmar quantidade"
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={cancelEditItem}
                            aria-label="Cancelar edicao"
                          >
                            <X className="size-4" />
                          </Button>
                        </li>
                      ) : (
                        <li
                          key={`${item.foodId}-${index}`}
                          className="flex items-center gap-3 px-3 py-2"
                        >
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
                            onClick={() => startEditItem(index)}
                            aria-label="Editar quantidade"
                          >
                            <Pencil className="size-4" />
                          </Button>
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
                      ),
                    )}
                  </ul>
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
              <Button type="submit" disabled={saving || (isEditing && mealItems.length === 0)}>
                {saving ? "Salvando..." : isEditing ? "Salvar alteracoes" : "Salvar refeicao"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <BarcodeScannerDialog
        open={scannerOpen}
        onClose={closeBarcodeScanner}
        onFound={(food) => {
          void cacheFoodInCatalog(food);
          selectFood(food);
        }}
      />
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
