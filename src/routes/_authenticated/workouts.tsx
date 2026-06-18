import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { ManualWorkoutDialog } from "@/components/manual-workout-dialog";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";

type Workout = {
  id: string;
  activity_type: string;
  title: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  calories: number | null;
  notes: string | null;
  performed_at: string;
};

export const Route = createFileRoute("/_authenticated/workouts")({
  head: () => ({ meta: [{ title: "Treinos - Lajes Fit" }] }),
  component: WorkoutsPage,
});

function fmtDuration(sec: number | null) {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

function fmtDist(m: number | null) {
  if (!m) return "—";
  return `${(m / 1000).toFixed(2)} km`;
}

function WorkoutsPage() {
  const { user } = Route.useRouteContext();
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("workouts")
      .select("id, activity_type, title, duration_seconds, distance_meters, calories, notes, performed_at")
      .eq("user_id", user.id)
      .order("performed_at", { ascending: false })
      .limit(100);
    setWorkouts(data ?? []);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-4xl">SEUS TREINOS</h1>
        <ManualWorkoutDialog userId={user.id} onCreated={load} />
      </header>

      {workouts === null ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : workouts.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Activity className="size-12 mx-auto mb-3 opacity-50" />
          <p className="font-display text-2xl">NENHUM TREINO AINDA</p>
          <p className="text-sm mt-1">Clique em "Registrar treino" pra começar.</p>
        </Card>
      ) : (
        workouts.map((w) => (
          <Card key={w.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{w.activity_type}</p>
                <h3 className="font-semibold text-lg mt-0.5">{w.title ?? w.activity_type}</h3>
                <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(w.performed_at), { addSuffix: true, locale: ptBR })}</p>
                {w.notes && <p className="text-sm mt-2 text-muted-foreground">{w.notes}</p>}
              </div>
              <div className="text-right text-sm space-y-1 shrink-0">
                <p><span className="text-muted-foreground">Tempo:</span> <span className="font-semibold">{fmtDuration(w.duration_seconds)}</span></p>
                <p><span className="text-muted-foreground">Dist:</span> <span className="font-semibold">{fmtDist(w.distance_meters)}</span></p>
                <p><span className="text-muted-foreground">Kcal:</span> <span className="font-semibold">{w.calories ?? "—"}</span></p>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
