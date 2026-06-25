import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/supabase-user";
import { notifyChange } from "@/features/fitness/change-event";

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
  } as IdrProfile;
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
