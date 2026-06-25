import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/supabase-user";

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

export function caloriesFromGrams(caloriesPer100g: number, grams: number) {
  return (caloriesPer100g * grams) / 100;
}

export function defaultMeasureForFood(food: TacoFood | null) {
  if (!food) return null;
  return food.measures.find((measure) => measure.isDefault) ?? food.measures[0] ?? null;
}

export function defaultQuantityForMeasure(measure: FoodMeasure | null) {
  if (!measure) return 100;
  if (measure.unit === "g") return 100;
  if (measure.unit === "ml") return 200;
  return 1;
}
