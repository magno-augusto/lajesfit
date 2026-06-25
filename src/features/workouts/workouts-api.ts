import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/supabase-user";
import { notifyChange } from "@/features/fitness/change-event";

export type LocalWorkout = {
  id: string;
  activityType: string;
  name: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  calories: number | null;
  startedAt: string;
};

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
