import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/supabase-user";
import { notifyChange } from "@/features/fitness/change-event";

export type LocalMeal = {
  id: string;
  dietMealId: string | null;
  foodId: number | null;
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

function mapMeal(row: {
  id: string;
  diet_meal_id: string | null;
  food_id?: number | null;
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
    foodId: row.food_id ?? null,
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
  const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (error) throw error;
  return data.signedUrl;
}

export async function getMeals() {
  const userId = await getUserId();
  const selectWithMealPhoto =
    "id, diet_meal_id, food_id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, photo_url, consumed_at, diet_meals(photo_url)";
  const selectWithoutMealPhoto =
    "id, diet_meal_id, food_id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, photo_url, consumed_at";

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
    console.error("Erro ao buscar registros de calorias:", fallbackError);
    throw new Error(fallbackError.message);
  }
  console.warn("Busca de refeicoes sem diet_meals(photo_url):", error.message);
  return (fallbackData ?? []).map(mapMeal);
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
  const itemList = items.map((item) => `- ${item.grams}g ${item.name}`).join("\n");

  return [
    `${mealLabel(meal)} registrado na dieta.`,
    `Total: ${Math.round(totals.calories)} kcal - ${totals.protein.toFixed(1)}P / ${totals.carbs.toFixed(1)}C / ${totals.fat.toFixed(1)}G.`,
    `Itens:`,
    itemList,
  ].join("\n");
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
      "id, diet_meal_id, food_id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, photo_url, consumed_at, diet_meals(photo_url)",
    )
    .single();

  if (error) {
    console.error("Erro ao registrar alimento:", error);
    throw new Error(error.message);
  }
  notifyChange();
  return mapMeal(data);
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
      "id, diet_meal_id, food_id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, photo_url, consumed_at, diet_meals(photo_url)",
    );

  if (error) {
    console.error("Erro ao registrar itens da refeicao:", error);
    throw new Error(error.message);
  }

  const savedMeals = (data ?? []).map(mapMeal);
  if (savedMeals.length !== items.length) {
    console.error("Registro de dieta incompleto:", {
      expected: items.length,
      received: savedMeals.length,
    });
    throw new Error("Nao foi possivel confirmar os itens da refeicao na Dieta");
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
  return savedMeals;
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

export async function updateMealItems(
  dietMealId: string,
  items: MealFoodInput[],
  nextMeal?: LocalMeal["meal"],
) {
  if (items.length === 0) throw new Error("Adicione pelo menos um alimento");

  const userId = await getUserId();
  const { data: mealRow, error: mealError } = await supabase
    .from("diet_meals")
    .select("meal, consumed_at")
    .eq("id", dietMealId)
    .eq("user_id", userId)
    .single();

  if (mealError) {
    console.error("Erro ao buscar refeicao:", mealError);
    throw new Error(mealError.message);
  }

  const meal = nextMeal ?? (mealRow.meal as LocalMeal["meal"]);
  if (meal !== mealRow.meal) {
    const { error: mealUpdateError } = await supabase
      .from("diet_meals")
      .update({ meal })
      .eq("id", dietMealId)
      .eq("user_id", userId);
    if (mealUpdateError) {
      console.error("Erro ao mover refeicao de categoria:", mealUpdateError);
      throw new Error(mealUpdateError.message);
    }
  }

  const { error: deleteError } = await supabase
    .from("diet_entries")
    .delete()
    .eq("diet_meal_id", dietMealId)
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Erro ao atualizar itens da refeicao:", deleteError);
    throw new Error(deleteError.message);
  }

  const { data, error } = await supabase
    .from("diet_entries")
    .insert(
      items.map((item) => ({
        user_id: userId,
        diet_meal_id: dietMealId,
        food_id: item.foodId ?? null,
        food_name: item.name,
        meal,
        grams: item.grams,
        kcal: item.calories,
        protein_g: item.protein,
        carbs_g: item.carbs,
        fat_g: item.fat,
        photo_url: null,
        consumed_at: mealRow.consumed_at,
      })),
    )
    .select(
      "id, diet_meal_id, food_id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, photo_url, consumed_at, diet_meals(photo_url)",
    );

  if (error) {
    console.error("Erro ao salvar itens da refeicao:", error);
    throw new Error(error.message);
  }
  notifyChange();
  return (data ?? []).map(mapMeal);
}

// Edicao de registros antigos, criados antes de existir diet_meals (sem
// diet_meal_id): substitui as entradas avulsas mantendo dia/horario originais.
export async function replaceLegacyMealEntries({
  entryIds,
  meal,
  consumedAt,
  items,
}: {
  entryIds: string[];
  meal: LocalMeal["meal"];
  consumedAt: string;
  items: MealFoodInput[];
}) {
  if (items.length === 0) throw new Error("Adicione pelo menos um alimento");
  if (entryIds.length === 0) throw new Error("Nenhum registro para editar");

  const userId = await getUserId();
  const { error: deleteError } = await supabase
    .from("diet_entries")
    .delete()
    .in("id", entryIds)
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Erro ao substituir itens da refeicao:", deleteError);
    throw new Error(deleteError.message);
  }

  const { data, error } = await supabase
    .from("diet_entries")
    .insert(
      items.map((item) => ({
        user_id: userId,
        diet_meal_id: null,
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
      "id, diet_meal_id, food_id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, photo_url, consumed_at",
    );

  if (error) {
    console.error("Erro ao salvar itens da refeicao:", error);
    throw new Error(error.message);
  }
  notifyChange();
  return (data ?? []).map(mapMeal);
}
