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
  createdAt: string;
};

export type LocalWorkout = {
  id: string;
  activityType: string;
  name: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  calories: number;
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

export const FOOD_OPTIONS = [
  { name: "Arroz branco cozido", calories: 128, protein: 2.5, carbs: 28.1, fat: 0.2 },
  { name: "Feijao carioca cozido", calories: 76, protein: 4.8, carbs: 13.6, fat: 0.5 },
  { name: "Frango grelhado", calories: 159, protein: 32, carbs: 0, fat: 2.5 },
  { name: "Ovo cozido", calories: 146, protein: 13.3, carbs: 0.6, fat: 9.5 },
  { name: "Banana prata", calories: 98, protein: 1.3, carbs: 26, fat: 0.1 },
  { name: "Batata doce cozida", calories: 77, protein: 0.6, carbs: 18.4, fat: 0.1 },
  { name: "Macarrao cozido", calories: 158, protein: 5.8, carbs: 30.9, fat: 0.9 },
  { name: "Carne bovina grelhada", calories: 219, protein: 32.4, carbs: 0, fat: 8.9 },
  { name: "Iogurte natural", calories: 51, protein: 4.1, carbs: 1.9, fat: 3 },
  { name: "Pao frances", calories: 300, protein: 8, carbs: 58.6, fat: 3.1 },
];

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
    createdAt: row.consumed_at,
  };
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
    calories: row.calories ?? 0,
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
    .select("id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, consumed_at")
    .eq("user_id", userId)
    .order("consumed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMeal);
}

export async function addMeal(meal: Omit<LocalMeal, "id" | "createdAt">) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("diet_entries")
    .insert({
      user_id: userId,
      food_name: meal.name,
      meal: meal.meal,
      grams: meal.grams,
      kcal: meal.calories,
      protein_g: meal.protein,
      carbs_g: meal.carbs,
      fat_g: meal.fat,
    })
    .select("id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, consumed_at")
    .single();

  if (error) throw new Error(error.message);
  notifyChange();
  return mapMeal(data);
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
      calories: Math.round(workout.calories),
      performed_at: workout.startedAt,
    })
    .select("id, activity_type, title, distance_meters, duration_seconds, calories, performed_at")
    .single();

  if (error) throw new Error(error.message);
  notifyChange();
  return mapWorkout(data);
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
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      mounted = false;
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const summary = useMemo<CalorieSummary>(() => {
    const dailyTarget = idrProfile?.idrCalories ?? 0;
    const mealCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
    const workoutCalories = workouts.reduce((sum, workout) => sum + workout.calories, 0);
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
