import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LocalMeal = {
  id: string;
  name: string;
  meal: "breakfast" | "lunch" | "snack" | "dinner";
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photoUrl: string | null;
  createdAt: string;
};

export type TacoFood = {
  id: number;
  name: string;
  category: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
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

const CHANGE_EVENT = "lajes-fit-backend-change";

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

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessao expirada. Entre novamente.");
  return data.user.id;
}

function mapMeal(row: {
  id: string;
  food_name: string;
  meal: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  photo_url: string | null;
  consumed_at: string;
}): LocalMeal {
  return {
    id: row.id,
    name: row.food_name,
    meal: row.meal as LocalMeal["meal"],
    grams: row.grams,
    calories: row.kcal,
    protein: row.protein_g,
    carbs: row.carbs_g,
    fat: row.fat_g,
    photoUrl: row.photo_url,
    createdAt: row.consumed_at,
  };
}

async function uploadMealPhoto(userId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/meals/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
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

function mapProfile(row: any): IdrProfile | null {
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
  const { data, error } = await supabase
    .from("diet_entries")
    .select("id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, photo_url, consumed_at")
    .eq("user_id", userId)
    .order("consumed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMeal);
}

export async function getTacoFoods() {
  const { data, error } = await supabase
    .from("taco_foods")
    .select("id, name, category, kcal, protein_g, carbs_g, fat_g, fiber_g")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map<TacoFood>((food) => ({
    id: food.id,
    name: food.name,
    category: food.category,
    calories: food.kcal,
    protein: food.protein_g,
    carbs: food.carbs_g,
    fat: food.fat_g,
    fiber: food.fiber_g,
  }));
}

export async function addMeal(
  meal: Omit<LocalMeal, "id" | "createdAt" | "photoUrl"> & {
    foodId?: number | null;
    photoFile?: File | null;
  },
) {
  const userId = await getUserId();
  const photoUrl = meal.photoFile ? await uploadMealPhoto(userId, meal.photoFile) : null;
  const { data, error } = await supabase
    .from("diet_entries")
    .insert({
      user_id: userId,
      food_id: meal.foodId ?? null,
      food_name: meal.name,
      meal: meal.meal,
      grams: meal.grams,
      kcal: meal.calories,
      protein_g: meal.protein,
      carbs_g: meal.carbs,
      fat_g: meal.fat,
      photo_url: photoUrl,
    })
    .select("id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, photo_url, consumed_at")
    .single();

  if (error) throw new Error(error.message);
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
}: {
  meal: LocalMeal["meal"];
  items: MealFoodInput[];
  photoFile?: File | null;
}) {
  if (items.length === 0) throw new Error("Adicione pelo menos um alimento");

  const userId = await getUserId();
  const photoUrl = photoFile ? await uploadMealPhoto(userId, photoFile) : null;
  const consumedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("diet_entries")
    .insert(
      items.map((item) => ({
        user_id: userId,
        food_id: item.foodId ?? null,
        food_name: item.name,
        meal,
        grams: item.grams,
        kcal: item.calories,
        protein_g: item.protein,
        carbs_g: item.carbs,
        fat_g: item.fat,
        photo_url: photoUrl,
        consumed_at: consumedAt,
      })),
    )
    .select("id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, photo_url, consumed_at");

  if (error) throw new Error(error.message);

  const { error: postError } = await supabase.from("posts").insert({
    user_id: userId,
    content: buildMealPostContent(meal, items),
    media_url: photoUrl,
  });
  if (postError) throw new Error(postError.message);

  notifyChange();
  return (data ?? []).map(mapMeal);
}

export async function removeMeal(id: string) {
  const userId = await getUserId();
  const { error } = await supabase.from("diet_entries").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  notifyChange();
}

export async function getWorkouts() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("workouts")
    .select("id, activity_type, title, distance_meters, duration_seconds, calories, performed_at")
    .eq("user_id", userId)
    .order("performed_at", { ascending: false });

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
  notifyChange();
  return mapWorkout(data);
}

export async function removeWorkout(id: string) {
  const userId = await getUserId();
  const { error } = await supabase.from("workouts").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
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
    } as any)
    .eq("id", userId)
    .select(
      "display_name, created_at, updated_at, calorie_goal, goal_sex, goal_age, goal_weight_kg, goal_height_cm, goal_activity_level",
    )
    .single();

  if (error) throw new Error(error.message);
  notifyChange();
  return mapProfile(data);
}

export function useLocalFitness() {
  const [meals, setMeals] = useState<LocalMeal[]>([]);
  const [workouts, setWorkouts] = useState<LocalWorkout[]>([]);
  const [idrProfile, setIdrProfile] = useState<IdrProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
          return;
        }

        const [nextMeals, nextWorkouts, nextProfile] = await Promise.all([
          getMeals(),
          getWorkouts(),
          getIdrProfile(),
        ]);
        if (!mounted) return;
        setMeals(nextMeals);
        setWorkouts(nextWorkouts);
        setIdrProfile(nextProfile);
      } catch {
        if (!mounted) return;
        setMeals([]);
        setWorkouts([]);
        setIdrProfile(null);
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
    const mealCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
    const workoutCalories = workouts.reduce((sum, workout) => sum + (workout.calories ?? 0), 0);
    return {
      dailyTarget,
      mealCalories,
      workoutCalories,
      remainingCalories: dailyTarget - mealCalories + workoutCalories,
    };
  }, [idrProfile, meals, workouts]);

  return { meals, workouts, idrProfile, summary, loading };
}

export function caloriesFromGrams(caloriesPer100g: number, grams: number) {
  return (caloriesPer100g * grams) / 100;
}
