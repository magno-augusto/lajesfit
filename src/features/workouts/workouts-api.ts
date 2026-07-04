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
  mediaUrl?: string | null;
};

function mapWorkout(row: {
  id: string;
  activity_type: string;
  title: string | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  calories: number | null;
  performed_at: string;
  media_url?: string | null;
}): LocalWorkout {
  return {
    id: row.id,
    activityType: row.activity_type,
    name: row.title,
    distanceMeters: row.distance_meters,
    durationSeconds: row.duration_seconds,
    calories: row.calories,
    startedAt: row.performed_at,
    mediaUrl: row.media_url ?? null,
  };
}

export async function uploadWorkoutPhoto(file: File) {
  const userId = await getUserId();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/workouts/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function getWorkouts() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("workouts")
    .select(
      "id, activity_type, title, distance_meters, duration_seconds, calories, performed_at, media_url",
    )
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
      media_url: workout.mediaUrl ?? null,
    })
    .select(
      "id, activity_type, title, distance_meters, duration_seconds, calories, performed_at, media_url",
    )
    .single();

  if (error) {
    console.error("Erro ao salvar treino:", error);
    throw new Error(error.message);
  }

  const { error: postError } = await supabase.from("posts").insert({
    user_id: userId,
    content: data.title ?? data.activity_type,
    media_url: data.media_url,
    workout_id: data.id,
    created_at: data.performed_at,
  });
  if (postError) {
    console.error("Erro ao publicar treino no feed:", postError);
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
      media_url: workout.mediaUrl ?? null,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(
      "id, activity_type, title, distance_meters, duration_seconds, calories, performed_at, media_url",
    )
    .single();

  if (error) {
    console.error("Erro ao atualizar treino:", error);
    throw new Error(error.message);
  }

  // mantem a publicacao do treino no feed em sincronia (titulo e foto)
  const { error: postError } = await supabase
    .from("posts")
    .update({
      content: data.title ?? data.activity_type,
      media_url: data.media_url,
      created_at: data.performed_at,
    })
    .eq("workout_id", id)
    .eq("user_id", userId);
  if (postError) {
    console.error("Erro ao atualizar publicacao do treino:", postError);
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
