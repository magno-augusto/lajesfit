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
    let syncInFlight = false;
    let syncQueued = false;
    // undefined = nunca sincronizou; null = sincronizou sem sessao; string = user carregado.
    // Enquanto o usuario carregado nao muda, re-syncs rodam em silencio (sem
    // setLoading), para o AppShell nao desmontar as telas a cada foco/refresh
    // de token e perder o estado dos formularios.
    let loadedUserId: string | null | undefined = undefined;
    let lastSyncAt = 0;

    async function sync() {
      if (syncInFlight) {
        syncQueued = true;
        return;
      }
      syncInFlight = true;

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;
      const isInitial = loadedUserId === undefined || loadedUserId !== userId;
      if (isInitial && mounted) setLoading(true);

      try {
        if (!userId) {
          loadedUserId = null;
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
        loadedUserId = userId;
        lastSyncAt = Date.now();
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
        if (isInitial) {
          setMeals([]);
          setWorkouts([]);
          setIdrProfile(null);
          setError(
            "Nao foi possivel carregar seus dados. Verifique a configuracao do Supabase e tente novamente.",
          );
        }
        // Re-sync em background falhou (ex.: rede instavel ao voltar o foco):
        // mantem os dados atuais em vez de zerar, senao o guard do AppShell
        // redirecionaria para /setup com idrProfile null.
      } finally {
        syncInFlight = false;
        if (mounted && isInitial) setLoading(false);
        if (syncQueued) {
          syncQueued = false;
          void sync();
        }
      }
    }

    void sync();

    const BACKGROUND_MIN_INTERVAL_MS = 15_000;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user?.id ?? null;
      const redundant =
        (event === "TOKEN_REFRESHED" ||
          event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "USER_UPDATED") &&
        nextUserId !== null &&
        nextUserId === loadedUserId;
      if (redundant && Date.now() - lastSyncAt < BACKGROUND_MIN_INTERVAL_MS) return;
      void sync();
    });

    const handleChange = () => void sync();
    window.addEventListener(CHANGE_EVENT, handleChange);
    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener(CHANGE_EVENT, handleChange);
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
