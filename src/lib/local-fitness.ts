import { useEffect, useMemo, useState } from "react";

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

const MEALS_KEY = "lajes-fit-meals";
const WORKOUTS_KEY = "lajes-fit-workouts";
const IDR_PROFILE_KEY = "lajes-fit-idr-profile";
const CHANGE_EVENT = "lajes-fit-storage-change";

export const LOCAL_USER = {
  id: "local-user",
  username: "atleta",
  displayName: "Atleta Local",
};

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

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getMeals() {
  return readStorage<LocalMeal[]>(MEALS_KEY, []);
}

export function saveMeals(meals: LocalMeal[]) {
  writeStorage(MEALS_KEY, meals);
}

export function addMeal(meal: Omit<LocalMeal, "id" | "createdAt">) {
  const next: LocalMeal = {
    ...meal,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  saveMeals([next, ...getMeals()]);
  return next;
}

export function removeMeal(id: string) {
  saveMeals(getMeals().filter((meal) => meal.id !== id));
}

export function getWorkouts() {
  return readStorage<LocalWorkout[]>(WORKOUTS_KEY, []);
}

export function saveWorkouts(workouts: LocalWorkout[]) {
  writeStorage(WORKOUTS_KEY, workouts);
}

export function addWorkout(workout: Omit<LocalWorkout, "id">) {
  const next: LocalWorkout = {
    ...workout,
    id: crypto.randomUUID(),
  };
  saveWorkouts([next, ...getWorkouts()]);
  return next;
}

export function calculateIdr(input: Omit<IdrProfile, "idrCalories" | "createdAt">) {
  const base =
    input.sex === "male"
      ? 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + 5
      : 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age - 161;

  return Math.round(base * ACTIVITY_FACTORS[input.activityLevel].factor);
}

export function getIdrProfile() {
  return readStorage<IdrProfile | null>(IDR_PROFILE_KEY, null);
}

export function saveIdrProfile(profile: Omit<IdrProfile, "idrCalories" | "createdAt">) {
  const next: IdrProfile = {
    ...profile,
    idrCalories: calculateIdr(profile),
    createdAt: new Date().toISOString(),
  };
  writeStorage(IDR_PROFILE_KEY, next);
  return next;
}

export function getCalorieSummary(): CalorieSummary {
  const dailyTarget = getIdrProfile()?.idrCalories ?? 0;
  const mealCalories = getMeals().reduce((sum, meal) => sum + meal.calories, 0);
  const workoutCalories = getWorkouts().reduce((sum, workout) => sum + workout.calories, 0);
  return {
    dailyTarget,
    mealCalories,
    workoutCalories,
    remainingCalories: dailyTarget - mealCalories + workoutCalories,
  };
}

export function useLocalFitness() {
  const [meals, setMeals] = useState<LocalMeal[]>(() => getMeals());
  const [workouts, setWorkouts] = useState<LocalWorkout[]>(() => getWorkouts());
  const [idrProfile, setIdrProfile] = useState<IdrProfile | null>(() => getIdrProfile());

  useEffect(() => {
    function sync() {
      setMeals(getMeals());
      setWorkouts(getWorkouts());
      setIdrProfile(getIdrProfile());
    }

    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
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

  return { meals, workouts, idrProfile, summary };
}

export function caloriesFromGrams(caloriesPer100g: number, grams: number) {
  return (caloriesPer100g * grams) / 100;
}
