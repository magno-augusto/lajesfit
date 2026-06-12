import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Activity, Plus, Zap } from "lucide-react";
import { formatDistance, formatDuration, timeAgo } from "@/lib/feed";

export const Route = createFileRoute("/_authenticated/workouts")({
  head: () => ({ meta: [{ title: "Treinos · Lajes Fit" }] }),
  component: WorkoutsPage,
});

type Workout = {
  id: string; activity_type: string; name: string | null; source: "manual" | "strava";
  distance_meters: number | null; duration_seconds: number | null; calories: number | null;
  started_at: string;
};

function WorkoutsPage() {
  const { user } = Route.useRouteContext();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stravaConnected, setStravaConnected] = useState(false);

  useEffect(() => {
    supabase.from("workouts").select("*").eq("user_id", user.id).order("started_at", { ascending: false }).limit(50)
      .then(({ data }) => setWorkouts((data ?? []) as Workout[]));
    supabase.from("strava_tokens").select("user_id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setStravaConnected(!!data));
  }, [user.id]);

  const totals = workouts.reduce((a, w) => ({
    distance: a.distance + (w.distance_meters ?? 0),
    duration: a.duration + (w.duration_seconds ?? 0),
    calories: a.calories + (w.calories ?? 0),
    count: a.count + 1,
  }), { distance: 0, duration: 0, calories: 0, count: 0 });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-6 shadow-glow">
          <p className="text-xs uppercase tracking-widest opacity-80">Resumo total</p>
          <p className="font-display text-5xl mt-1">{formatDistance(totals.distance)}</p>
          <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
            <div><p className="opacity-70 text-xs">Treinos</p><p className="font-display text-xl">{totals.count}</p></div>
            <div><p className="opacity-70 text-xs">Tempo</p><p className="font-display text-xl">{Math.round(totals.duration / 3600)}h</p></div>
            <div><p className="opacity-70 text-xs">Calorias</p><p className="font-display text-xl">{Math.round(totals.calories)}</p></div>
          </div>
        </div>
        <div className="rounded-2xl bg-card border shadow-card p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-10 rounded-lg bg-[#FC4C02] grid place-items-center text-white"><Zap className="size-5" /></div>
            <div>
              <p className="font-display text-xl leading-none">STRAVA</p>
              <p className="text-xs text-muted-foreground">Importe seus treinos</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground flex-1 my-2">
            {stravaConnected ? "Sua conta Strava está conectada." : "Conecte sua conta Strava para importar corridas e bikes automaticamente."}
          </p>
          <Button asChild variant={stravaConnected ? "outline" : "default"} className="w-full">
            <Link to="/settings">{stravaConnected ? "Gerenciar" : "Conectar Strava"}</Link>
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border shadow-card">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-display text-2xl">MEUS TREINOS</h2>
          <Button asChild size="sm" variant="secondary"><Link to="/feed"><Plus className="size-4 mr-1" /> Registrar</Link></Button>
        </div>
        <ul className="divide-y">
          {workouts.length === 0 && <li className="p-8 text-center text-muted-foreground text-sm">Nenhum treino registrado ainda</li>}
          {workouts.map((w) => (
            <li key={w.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/40">
              <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <Activity className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{w.name ?? w.activity_type}</p>
                <p className="text-xs text-muted-foreground">{w.activity_type} · {timeAgo(w.started_at)} {w.source === "strava" && "· via Strava"}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg">{formatDistance(w.distance_meters)}</p>
                <p className="text-xs text-muted-foreground">{formatDuration(w.duration_seconds)} · {w.calories ? `${Math.round(w.calories)} kcal` : "—"}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
