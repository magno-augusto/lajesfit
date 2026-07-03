import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isSameLocalDate } from "@/lib/date";
import { getMeals, type LocalMeal } from "@/features/diet/meals-api";
import { getWorkouts, type LocalWorkout } from "@/features/workouts/workouts-api";
import { getIdrProfile, type IdrProfile } from "@/features/goals/goals-api";
import { CHANGE_EVENT } from "./change-event";

export type CalorieSummary = {
  dailyTarget: number;
  mealCalories: number;
  workoutCalories: number;
  limitCalories: number;
  balanceCalories: number;
  remainingCalories: number;
};

export function useFitness() {
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

        // Sessao de usuario que nao existe mais (ex.: conta excluida): desloga
        // para levar ao /auth em vez de travar na tela de erro. Erros de rede
        // (status ausente/0) nao deslogam.
        const { error: userError } = await supabase.auth.getUser();
        if (userError && (userError.status === 401 || userError.status === 403)) {
          await supabase.auth.signOut({ scope: "local" });
          return;
        }

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
      .filter((meal) => isSameLocalDate(meal.createdAt, today))
      .reduce((sum, meal) => sum + meal.calories, 0);
    const workoutCalories = workouts
      .filter((workout) => isSameLocalDate(workout.startedAt, today))
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
