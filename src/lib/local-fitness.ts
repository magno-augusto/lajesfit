import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LocalMeal = {
  id: string;
  dietMealId: string | null;
  name: string;
  meal: "breakfast" | "lunch" | "snack" | "dinner";
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photoUrl: string | null;
  mealPhotoUrl: string | null;
  createdAt: string;
};

export type FoodSource = "tbca" | "taco" | "open_food_facts" | "manual" | "estimated";

export type FoodMeasureUnit = "g" | "ml" | "unit" | "tsp" | "tbsp" | "cup" | "serving";

export type FoodMeasure = {
  id: string;
  label: string;
  unit: FoodMeasureUnit;
  grams: number;
  isDefault?: boolean;
};

export type TacoFood = {
  id: string;
  foodId: number | null;
  source: FoodSource;
  sourceId: string | null;
  brand: string | null;
  name: string;
  category: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  aliases: string[];
  measures: FoodMeasure[];
};

export type MealFoodInput = {
  name: string;
  foodId?: number | null;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealPhotoInput = File | Blob;

export type LocalWorkout = {
  id: string;
  activityType: string;
  name: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  calories: number | null;
  startedAt: string;
};

export type CalorieSummary = {
  dailyTarget: number;
  mealCalories: number;
  workoutCalories: number;
  limitCalories: number;
  balanceCalories: number;
  remainingCalories: number;
};

export type IdrProfile = {
  name: string;
  sex: "female" | "male";
  age: number;
  weightKg: number;
  heightCm: number;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  idrCalories: number;
  createdAt: string;
};

type ProfileRow = {
  display_name: string | null;
  created_at: string;
  updated_at: string | null;
  calorie_goal: number | null;
  goal_sex: string | null;
  goal_age: number | null;
  goal_weight_kg: number | null;
  goal_height_cm: number | null;
  goal_activity_level: string | null;
};

type FoodMeasureRow = {
  id?: number | string | null;
  label?: string | null;
  unit?: string | null;
  grams?: number | string | null;
  is_default?: boolean | null;
};

type FoodCatalogRow = {
  id: number | string;
  source: string;
  source_id: string | null;
  brand: string | null;
  name: string;
  category: string | null;
  kcal: number | string | null;
  protein_g: number | string | null;
  carbs_g: number | string | null;
  fat_g: number | string | null;
  fiber_g: number | string | null;
  aliases?: string[] | null;
  food_measures?: FoodMeasureRow[] | null;
};

type OpenFoodFactsProduct = {
  brands?: unknown;
  categories?: unknown;
  code?: unknown;
  nutriments?: Record<string, unknown>;
  product_name?: unknown;
  serving_size?: unknown;
};

const CHANGE_EVENT = "lajesfit-backend-change";

export const ACTIVITY_FACTORS: Record<
  IdrProfile["activityLevel"],
  { label: string; factor: number }
> = {
  sedentary: { label: "Pouco ou nenhum exercicio", factor: 1.2 },
  light: { label: "Exercicio leve 1-3 dias/semana", factor: 1.375 },
  moderate: { label: "Exercicio moderado 3-5 dias/semana", factor: 1.55 },
  active: { label: "Exercicio intenso 6-7 dias/semana", factor: 1.725 },
  very_active: { label: "Treino muito intenso ou trabalho fisico", factor: 1.9 },
};

function notifyChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

function isSameLocalDay(isoDate: string, day: Date) {
  const date = new Date(isoDate);
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessao expirada. Entre novamente.");
  return data.user.id;
}

function mapMeal(row: {
  id: string;
  diet_meal_id: string | null;
  food_name: string;
  meal: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  photo_url: string | null;
  diet_meals?: { photo_url: string | null } | null;
  consumed_at: string;
}): LocalMeal {
  return {
    id: row.id,
    dietMealId: row.diet_meal_id,
    name: row.food_name,
    meal: row.meal as LocalMeal["meal"],
    grams: row.grams,
    calories: row.kcal,
    protein: row.protein_g,
    carbs: row.carbs_g,
    fat: row.fat_g,
    photoUrl: row.photo_url,
    mealPhotoUrl: row.diet_meals?.photo_url ?? null,
    createdAt: row.consumed_at,
  };
}

async function uploadMealPhoto(userId: string, file: MealPhotoInput) {
  const sourceName = file instanceof File ? file.name : "meal-photo.jpg";
  const safeName = sourceName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/meals/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("media").upload(path, file, {
    contentType: file.type || "image/jpeg",
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (error) throw error;
  return data.signedUrl;
}

function mapWorkout(row: {
  id: string;
  activity_type: string;
  title: string | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  calories: number | null;
  performed_at: string;
}): LocalWorkout {
  return {
    id: row.id,
    activityType: row.activity_type,
    name: row.title,
    distanceMeters: row.distance_meters,
    durationSeconds: row.duration_seconds,
    calories: row.calories,
    startedAt: row.performed_at,
  };
}

function mapProfile(row: ProfileRow | null): IdrProfile | null {
  if (!row?.calorie_goal) return null;

  return {
    name: row.display_name,
    sex: row.goal_sex,
    age: row.goal_age,
    weightKg: row.goal_weight_kg,
    heightCm: row.goal_height_cm,
    activityLevel: row.goal_activity_level,
    idrCalories: row.calorie_goal,
    createdAt: row.updated_at ?? row.created_at,
  };
}

export async function getMeals() {
  const userId = await getUserId();
  const selectWithMealPhoto =
    "id, diet_meal_id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, photo_url, consumed_at, diet_meals(photo_url)";
  const selectWithoutMealPhoto =
    "id, diet_meal_id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, photo_url, consumed_at";

  const { data, error } = await supabase
    .from("diet_entries")
    .select(selectWithMealPhoto)
    .eq("user_id", userId)
    .order("consumed_at", { ascending: false });

  if (!error) return (data ?? []).map(mapMeal);

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("diet_entries")
    .select(selectWithoutMealPhoto)
    .eq("user_id", userId)
    .order("consumed_at", { ascending: false });

  if (fallbackError) {
    console.error("Erro ao buscar registros de calorias:", error);
    throw new Error(fallbackError.message);
  }
  console.warn("Busca de refeicoes sem diet_meals(photo_url):", error.message);
  return (fallbackData ?? []).map(mapMeal);
}

export function normalizeFoodSearch(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FOOD_SEARCH_STOP_WORDS = new Set([
  "a",
  "as",
  "ao",
  "aos",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "o",
  "os",
]);

function foodSearchTokens(value: string) {
  return normalizeFoodSearch(value)
    .split(" ")
    .filter((token) => token && !FOOD_SEARCH_STOP_WORDS.has(token));
}

function isLiquidFood(food: Pick<TacoFood, "name" | "category">) {
  const text = `${normalizeFoodSearch(food.name)} ${normalizeFoodSearch(food.category)}`;
  return /\b(bebida|suco|refresco|refrigerante|agua|cafe|cha|leite|iogurte|caldo|sopa|vitamina)\b/.test(
    text,
  );
}

function isFruitFood(food: Pick<TacoFood, "name" | "category">) {
  const text = `${normalizeFoodSearch(food.name)} ${normalizeFoodSearch(food.category)}`;
  return (
    text.includes("frutas") ||
    /\b(maca|banana|laranja|pera|mamao|manga|uva|abacate|abacaxi|acerola|morango|melancia|melao|kiwi)\b/.test(
      text,
    )
  );
}

function isSpoonFriendlyFood(food: Pick<TacoFood, "name" | "category">) {
  const text = `${normalizeFoodSearch(food.name)} ${normalizeFoodSearch(food.category)}`;
  return /\b(acucar|achocolatado|farinha|aveia|mel|manteiga|margarina|maionese|azeite|oleo|pasta|creme|requeijao|molho)\b/.test(
    text,
  );
}

function isCupFriendlyFood(food: Pick<TacoFood, "name" | "category">) {
  const text = `${normalizeFoodSearch(food.name)} ${normalizeFoodSearch(food.category)}`;
  return /\b(arroz|feijao|lentilha|grao|cereal|granola|aveia|leite|suco|bebida|iogurte)\b/.test(
    text,
  );
}

function uniqueMeasures(measures: FoodMeasure[]) {
  const seen = new Set<string>();
  return measures.filter((measure) => {
    const key = `${measure.unit}:${measure.label}`;
    if (seen.has(key) || measure.grams <= 0) return false;
    seen.add(key);
    return true;
  });
}

function defaultMeasuresForFood(food: Pick<TacoFood, "name" | "category">) {
  const measures: FoodMeasure[] = [{ id: "g", label: "gramas", unit: "g", grams: 1 }];

  if (isLiquidFood(food)) {
    measures.push({ id: "ml", label: "ml", unit: "ml", grams: 1, isDefault: true });
  }

  if (isFruitFood(food)) {
    measures.push({ id: "unit", label: "unidade", unit: "unit", grams: 130, isDefault: true });
  }

  if (isSpoonFriendlyFood(food)) {
    measures.push(
      { id: "tsp", label: "colher de cha", unit: "tsp", grams: 5 },
      {
        id: "tbsp",
        label: "colher de sopa",
        unit: "tbsp",
        grams: 15,
        isDefault: !isLiquidFood(food),
      },
    );
  }

  if (isCupFriendlyFood(food)) {
    measures.push({
      id: "cup",
      label: "xicara",
      unit: "cup",
      grams: isLiquidFood(food) ? 240 : 160,
    });
  }

  if (!measures.some((measure) => measure.isDefault)) {
    measures[0] = { ...measures[0], isDefault: true };
  }

  return uniqueMeasures(measures);
}

function mapFood(row: FoodCatalogRow): TacoFood {
  const food = {
    id: `${row.source}:${row.source_id ?? row.id}`,
    foodId: row.source === "taco" && row.source_id ? Number(row.source_id) : null,
    source: row.source as FoodSource,
    sourceId: row.source_id ?? String(row.id),
    brand: row.brand ?? null,
    name: row.name,
    category: row.category,
    calories: Number(row.kcal) || 0,
    protein: Number(row.protein_g) || 0,
    carbs: Number(row.carbs_g) || 0,
    fat: Number(row.fat_g) || 0,
    fiber: Number(row.fiber_g) || 0,
    aliases: Array.isArray(row.aliases) ? row.aliases.filter(Boolean).map(String) : [],
  };
  const importedMeasures = Array.isArray(row.food_measures)
    ? row.food_measures.map((measure) => ({
        id: String(measure.id ?? `${measure.unit}:${measure.label}`),
        label: String(measure.label ?? measure.unit),
        unit: measure.unit as FoodMeasureUnit,
        grams: Number(measure.grams) || 0,
        isDefault: Boolean(measure.is_default),
      }))
    : [];
  const measures = uniqueMeasures([...importedMeasures, ...defaultMeasuresForFood(food)]);
  return { ...food, measures };
}

export async function getFoodCatalog() {
  const { data: foodsData, error: foodsError } = await supabase
    .from("foods")
    .select(
      "id, source, source_id, name, category, brand, kcal, protein_g, carbs_g, fat_g, fiber_g, aliases, food_measures(id, label, unit, grams, is_default)",
    )
    .order("source", { ascending: true })
    .order("name", { ascending: true })
    .limit(2500);

  if (!foodsError && foodsData) {
    return foodsData.map<TacoFood>(mapFood);
  }

  const { data, error } = await supabase
    .from("taco_foods")
    .select("id, name, category, kcal, protein_g, carbs_g, fat_g, fiber_g")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao buscar catalogo de alimentos legado:", error);
    throw new Error(error.message);
  }
  return (data ?? []).map<TacoFood>((food) =>
    mapFood({
      id: food.id,
      source: "taco",
      source_id: String(food.id),
      brand: null,
      name: food.name,
      category: food.category,
      kcal: food.kcal,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      fiber_g: food.fiber_g,
      aliases: [],
    }),
  );
}

export const getTacoFoods = getFoodCatalog;

export function foodMatchesQuery(food: TacoFood, rawQuery: string) {
  const query = normalizeFoodSearch(rawQuery);
  if (!query) return true;

  const searchText = [food.name, food.category, food.brand, ...food.aliases]
    .filter(Boolean)
    .map((value) => normalizeFoodSearch(value))
    .join(" ");
  const tokens = foodSearchTokens(query);

  return searchText.includes(query) || tokens.every((token) => searchText.includes(token));
}

export async function requestFoodSuggestion(query: string) {
  const normalizedQuery = normalizeFoodSearch(query);
  if (normalizedQuery.length < 2) {
    throw new Error("Digite um nome de alimento para sugerir.");
  }

  const userId = await getUserId();
  const { error } = await supabase.from("food_requests").insert({
    user_id: userId,
    query: query.trim(),
    normalized_query: normalizedQuery,
    status: "pending",
  });

  if (error?.code === "23505") return { alreadyExists: true };
  if (error) {
    console.error("Erro ao sugerir alimento:", error);
    throw new Error(error.message);
  }
  return { alreadyExists: false };
}

function numberFromOpenFoodFacts(value: unknown) {
  const numberValue = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function openFoodFactsCategory(product: OpenFoodFactsProduct) {
  if (typeof product.categories === "string" && product.categories.trim()) {
    return product.categories.split(",")[0]?.trim() || "Produto industrializado";
  }
  return "Produto industrializado";
}

function parseServingGrams(servingSize: unknown) {
  if (typeof servingSize !== "string") return null;
  const match = servingSize
    .toLowerCase()
    .replace(",", ".")
    .match(/(\d+(?:\.\d+)?)\s*(g|ml)/);
  if (!match) return null;
  return Number(match[1]);
}

export async function searchOpenFoodFactsFoods(query: string) {
  const search = query.trim();
  if (search.length < 3) return [];

  const params = new URLSearchParams({
    search_terms: search,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "12",
    countries_tags_en: "Brazil",
    fields: "code,product_name,brands,categories,serving_size,nutriments",
  });
  const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`);
  if (!response.ok) throw new Error("Nao foi possivel buscar produtos industrializados");

  const payload = await response.json();
  const products = Array.isArray(payload.products) ? payload.products : [];

  return products
    .map<TacoFood | null>((product: OpenFoodFactsProduct) => {
      const nutriments = product.nutriments ?? {};
      const calories =
        numberFromOpenFoodFacts(nutriments["energy-kcal_100g"]) ||
        numberFromOpenFoodFacts(nutriments["energy-kcal_value"]);
      const name = String(product.product_name ?? "").trim();
      const code = String(product.code ?? "").trim();
      const servingGrams = parseServingGrams(product.serving_size);

      if (!name || !code || calories <= 0) return null;

      const food = {
        id: `open_food_facts:${code}`,
        foodId: null,
        source: "open_food_facts" as const,
        sourceId: code,
        brand: typeof product.brands === "string" && product.brands.trim() ? product.brands : null,
        name,
        category: openFoodFactsCategory(product),
        calories,
        protein: numberFromOpenFoodFacts(nutriments.proteins_100g),
        carbs: numberFromOpenFoodFacts(nutriments.carbohydrates_100g),
        fat: numberFromOpenFoodFacts(nutriments.fat_100g),
        fiber: numberFromOpenFoodFacts(nutriments.fiber_100g),
        aliases: [],
      };
      const measures = defaultMeasuresForFood(food);
      if (servingGrams) {
        measures.unshift({
          id: "serving",
          label: "porcao",
          unit: "serving",
          grams: servingGrams,
          isDefault: true,
        });
      }

      return { ...food, measures: uniqueMeasures(measures) };
    })
    .filter((food): food is TacoFood => Boolean(food));
}

export async function cacheFoodInCatalog(food: TacoFood) {
  if (!["open_food_facts", "manual"].includes(food.source)) return;

  const { error } = await supabase.rpc("upsert_catalog_food", {
    p_source: food.source,
    p_source_id: food.sourceId ?? food.id,
    p_name: food.name,
    p_category: food.category,
    p_brand: food.brand,
    p_kcal: food.calories,
    p_protein_g: food.protein,
    p_carbs_g: food.carbs,
    p_fat_g: food.fat,
    p_fiber_g: food.fiber,
    p_measures: food.measures.map((measure) => ({
      id: measure.id,
      label: measure.label,
      unit: measure.unit,
      grams: measure.grams,
      isDefault: Boolean(measure.isDefault),
    })),
  });

  if (error) {
    console.warn("Nao foi possivel salvar alimento no catalogo combinado", error);
  }
}

export async function addMeal(
  meal: Omit<LocalMeal, "id" | "dietMealId" | "createdAt" | "photoUrl" | "mealPhotoUrl"> & {
    foodId?: number | null;
    photoFile?: MealPhotoInput | null;
    consumedAt?: string;
  },
) {
  const userId = await getUserId();
  const photoUrl = meal.photoFile ? await uploadMealPhoto(userId, meal.photoFile) : null;
  const consumedAt = meal.consumedAt ?? new Date().toISOString();
  const { data: mealData, error: mealError } = await supabase
    .from("diet_meals")
    .insert({
      user_id: userId,
      meal: meal.meal,
      photo_url: photoUrl,
      consumed_at: consumedAt,
    })
    .select("id")
    .single();

  if (mealError) {
    console.error("Erro ao criar refeicao:", mealError);
    throw new Error(mealError.message);
  }

  const { data, error } = await supabase
    .from("diet_entries")
    .insert({
      user_id: userId,
      diet_meal_id: mealData.id,
      food_id: meal.foodId ?? null,
      food_name: meal.name,
      meal: meal.meal,
      grams: meal.grams,
      kcal: meal.calories,
      protein_g: meal.protein,
      carbs_g: meal.carbs,
      fat_g: meal.fat,
      photo_url: null,
      consumed_at: consumedAt,
    })
    .select(
      "id, diet_meal_id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, photo_url, consumed_at, diet_meals(photo_url)",
    )
    .single();

  if (error) {
    console.error("Erro ao registrar alimento:", error);
    throw new Error(error.message);
  }
  notifyChange();
  return mapMeal(data);
}

function mealLabel(meal: LocalMeal["meal"]) {
  const labels: Record<LocalMeal["meal"], string> = {
    breakfast: "Cafe da manha",
    lunch: "Almoco",
    snack: "Lanche",
    dinner: "Jantar",
  };
  return labels[meal];
}

function buildMealPostContent(meal: LocalMeal["meal"], items: MealFoodInput[]) {
  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const itemList = items.map((item) => `${item.name} (${item.grams}g)`).join(", ");

  return [
    `${mealLabel(meal)} registrado na dieta.`,
    `Total: ${Math.round(totals.calories)} kcal - ${totals.protein.toFixed(1)}P / ${totals.carbs.toFixed(1)}C / ${totals.fat.toFixed(1)}G.`,
    `Itens: ${itemList}.`,
  ].join("\n");
}

export async function addMealWithItems({
  meal,
  items,
  photoFile,
  consumedAt: inputConsumedAt,
}: {
  meal: LocalMeal["meal"];
  items: MealFoodInput[];
  photoFile?: MealPhotoInput | null;
  consumedAt?: string;
}) {
  if (items.length === 0) throw new Error("Adicione pelo menos um alimento");

  const userId = await getUserId();
  const photoUrl = photoFile ? await uploadMealPhoto(userId, photoFile) : null;
  const consumedAt = inputConsumedAt ?? new Date().toISOString();
  const { data: mealData, error: mealError } = await supabase
    .from("diet_meals")
    .insert({
      user_id: userId,
      meal,
      photo_url: photoUrl,
      consumed_at: consumedAt,
    })
    .select("id")
    .single();

  if (mealError) {
    console.error("Erro ao criar refeicao:", mealError);
    throw new Error(mealError.message);
  }

  const { data, error } = await supabase
    .from("diet_entries")
    .insert(
      items.map((item) => ({
        user_id: userId,
        diet_meal_id: mealData.id,
        food_id: item.foodId ?? null,
        food_name: item.name,
        meal,
        grams: item.grams,
        kcal: item.calories,
        protein_g: item.protein,
        carbs_g: item.carbs,
        fat_g: item.fat,
        photo_url: null,
        consumed_at: consumedAt,
      })),
    )
    .select(
      "id, diet_meal_id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, photo_url, consumed_at, diet_meals(photo_url)",
    );

  if (error) {
    console.error("Erro ao registrar itens da refeicao:", error);
    throw new Error(error.message);
  }

  const { error: postError } = await supabase.from("posts").insert({
    user_id: userId,
    content: buildMealPostContent(meal, items),
    media_url: photoUrl,
  });
  if (postError) {
    console.error("Erro ao publicar refeicao no feed:", postError);
    throw new Error(postError.message);
  }

  notifyChange();
  return (data ?? []).map((row) =>
    mapMeal({
      ...row,
      diet_meals: row.diet_meals ?? { photo_url: photoUrl },
    }),
  );
}

export async function updateDietMealPhoto(dietMealId: string, photoFile: MealPhotoInput | null) {
  const userId = await getUserId();
  const photoUrl = photoFile ? await uploadMealPhoto(userId, photoFile) : null;
  const { error } = await supabase
    .from("diet_meals")
    .update({ photo_url: photoUrl })
    .eq("id", dietMealId)
    .eq("user_id", userId);

  if (error) {
    console.error("Erro ao atualizar foto da refeicao:", error);
    throw new Error(error.message);
  }
  notifyChange();
  return photoUrl;
}

export async function removeMeal(id: string) {
  const userId = await getUserId();
  const { error } = await supabase.from("diet_entries").delete().eq("id", id).eq("user_id", userId);
  if (error) {
    console.error("Erro ao remover registro de calorias:", error);
    throw new Error(error.message);
  }
  notifyChange();
}

export async function getWorkouts() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("workouts")
    .select("id, activity_type, title, distance_meters, duration_seconds, calories, performed_at")
    .eq("user_id", userId)
    .order("performed_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar treinos:", error);
    throw new Error(error.message);
  }
  return (data ?? []).map(mapWorkout);
}

export async function addWorkout(workout: Omit<LocalWorkout, "id">) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      activity_type: workout.activityType,
      title: workout.name,
      distance_meters: workout.distanceMeters,
      duration_seconds: workout.durationSeconds,
      calories: workout.calories === null ? null : Math.round(workout.calories),
      performed_at: workout.startedAt,
    })
    .select("id, activity_type, title, distance_meters, duration_seconds, calories, performed_at")
    .single();

  if (error) {
    console.error("Erro ao salvar treino:", error);
    throw new Error(error.message);
  }
  notifyChange();
  return mapWorkout(data);
}

export async function updateWorkout(id: string, workout: Omit<LocalWorkout, "id">) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("workouts")
    .update({
      activity_type: workout.activityType,
      title: workout.name,
      distance_meters: workout.distanceMeters,
      duration_seconds: workout.durationSeconds,
      calories: workout.calories === null ? null : Math.round(workout.calories),
      performed_at: workout.startedAt,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, activity_type, title, distance_meters, duration_seconds, calories, performed_at")
    .single();

  if (error) {
    console.error("Erro ao atualizar treino:", error);
    throw new Error(error.message);
  }
  notifyChange();
  return mapWorkout(data);
}

export async function removeWorkout(id: string) {
  const userId = await getUserId();
  const { error } = await supabase.from("workouts").delete().eq("id", id).eq("user_id", userId);
  if (error) {
    console.error("Erro ao remover treino:", error);
    throw new Error(error.message);
  }
  notifyChange();
}

export function calculateIdr(input: Omit<IdrProfile, "idrCalories" | "createdAt">) {
  const base =
    input.sex === "male"
      ? 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + 5
      : 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age - 161;

  return Math.round(base * ACTIVITY_FACTORS[input.activityLevel].factor);
}

export async function getIdrProfile() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "display_name, created_at, updated_at, calorie_goal, goal_sex, goal_age, goal_weight_kg, goal_height_cm, goal_activity_level",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar objetivo calorico:", error);
    throw new Error(error.message);
  }
  return mapProfile(data);
}

export async function saveIdrProfile(profile: Omit<IdrProfile, "idrCalories" | "createdAt">) {
  const userId = await getUserId();
  const calorieGoal = calculateIdr(profile);
  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: profile.name,
      calorie_goal: calorieGoal,
      goal_sex: profile.sex,
      goal_age: profile.age,
      goal_weight_kg: profile.weightKg,
      goal_height_cm: profile.heightCm,
      goal_activity_level: profile.activityLevel,
    })
    .eq("id", userId)
    .select(
      "display_name, created_at, updated_at, calorie_goal, goal_sex, goal_age, goal_weight_kg, goal_height_cm, goal_activity_level",
    )
    .single();

  if (error) {
    console.error("Erro ao salvar objetivo calorico:", error);
    throw new Error(error.message);
  }
  notifyChange();
  return mapProfile(data);
}

export function useLocalFitness() {
  const [meals, setMeals] = useState<LocalMeal[]>([]);
  const [workouts, setWorkouts] = useState<LocalWorkout[]>([]);
  const [idrProfile, setIdrProfile] = useState<IdrProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function sync() {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          if (!mounted) return;
          setMeals([]);
          setWorkouts([]);
          setIdrProfile(null);
          setError(null);
          return;
        }

        const [mealsResult, workoutsResult, profileResult] = await Promise.allSettled([
          getMeals(),
          getWorkouts(),
          getIdrProfile(),
        ]);
        if (profileResult.status === "rejected") throw profileResult.reason;
        if (!mounted) return;
        setMeals(mealsResult.status === "fulfilled" ? mealsResult.value : []);
        setWorkouts(workoutsResult.status === "fulfilled" ? workoutsResult.value : []);
        setIdrProfile(profileResult.value);
        setError(
          mealsResult.status === "rejected" || workoutsResult.status === "rejected"
            ? "Alguns dados de dieta ou treino nao foram carregados agora."
            : null,
        );
      } catch (syncError) {
        console.error("Erro ao sincronizar dados de fitness:", syncError);
        if (!mounted) return;
        setMeals([]);
        setWorkouts([]);
        setIdrProfile(null);
        setError(
          "Nao foi possivel carregar seus dados. Verifique a configuracao do Supabase e tente novamente.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    sync();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      sync();
    });

    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const summary = useMemo<CalorieSummary>(() => {
    const dailyTarget = idrProfile?.idrCalories ?? 0;
    const today = new Date();
    const mealCalories = meals
      .filter((meal) => isSameLocalDay(meal.createdAt, today))
      .reduce((sum, meal) => sum + meal.calories, 0);
    const workoutCalories = workouts
      .filter((workout) => isSameLocalDay(workout.startedAt, today))
      .reduce((sum, workout) => sum + (workout.calories ?? 0), 0);
    return {
      dailyTarget,
      mealCalories,
      workoutCalories,
      limitCalories: dailyTarget + workoutCalories,
      balanceCalories: mealCalories - workoutCalories - dailyTarget,
      remainingCalories: dailyTarget - mealCalories + workoutCalories,
    };
  }, [idrProfile, meals, workouts]);

  return { meals, workouts, idrProfile, summary, loading, error };
}

export function caloriesFromGrams(caloriesPer100g: number, grams: number) {
  return (caloriesPer100g * grams) / 100;
}
