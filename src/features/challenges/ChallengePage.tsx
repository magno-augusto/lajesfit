import { useEffect, useState } from "react";
import { CalendarCheck, Flame, Footprints, Scale, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalAuth } from "@/features/auth/auth";
import { CHANGE_EVENT } from "@/features/fitness/change-event";
import { supabase } from "@/integrations/supabase/client";
import { AdminParticipantsCard } from "./AdminParticipantsCard";
import { ChallengeCard } from "./ChallengeCard";
import { PodiumCard } from "./PodiumCard";
import {
  ensureChallengeLifecycle,
  getActiveChallenge,
  getCaloriesLeaderboard,
  getDietDaysLeaderboard,
  getDistanceLeaderboard,
  getLastClosedChallenge,
  getLeaderboard,
  getTopThree,
  getWorkoutDaysLeaderboard,
  type ActivityDaysEntry,
  type CaloriesEntry,
  type Challenge,
  type DistanceEntry,
  type LeaderboardEntry,
} from "./challenges-api";

function formatDistance(meters: number) {
  const km = meters / 1000;
  return `${km.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function ChallengePage() {
  const { user, loading: authLoading } = useLocalAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [topThree, setTopThree] = useState<LeaderboardEntry[]>([]);
  const [workoutDays, setWorkoutDays] = useState<ActivityDaysEntry[]>([]);
  const [distance, setDistance] = useState<DistanceEntry[]>([]);
  const [caloriesBurned, setCaloriesBurned] = useState<CaloriesEntry[]>([]);
  const [dietDays, setDietDays] = useState<ActivityDaysEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(data?.is_admin ?? false));
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    load().finally(() => {
      if (mounted) setLoading(false);
    });

    async function load() {
      try {
        await ensureChallengeLifecycle();
        // allSettled: a falha de um ranking nao pode esvaziar os demais cards
        const [active, lastClosed, workoutDaysBoard, distanceBoard, caloriesBoard, dietDaysBoard] =
          await Promise.allSettled([
            getActiveChallenge(),
            getLastClosedChallenge(),
            getWorkoutDaysLeaderboard(),
            getDistanceLeaderboard(),
            getCaloriesLeaderboard(),
            getDietDaysLeaderboard(),
          ]);
        if (!mounted) return;
        setChallenge(active.status === "fulfilled" ? active.value : null);
        setWorkoutDays(workoutDaysBoard.status === "fulfilled" ? workoutDaysBoard.value : []);
        setDistance(distanceBoard.status === "fulfilled" ? distanceBoard.value : []);
        setCaloriesBurned(caloriesBoard.status === "fulfilled" ? caloriesBoard.value : []);
        setDietDays(dietDaysBoard.status === "fulfilled" ? dietDaysBoard.value : []);

        const activeChallenge = active.status === "fulfilled" ? active.value : null;
        const lastClosedChallenge = lastClosed.status === "fulfilled" ? lastClosed.value : null;
        const [board, top3] = await Promise.allSettled([
          activeChallenge ? getLeaderboard(activeChallenge.id) : Promise.resolve([]),
          lastClosedChallenge ? getTopThree(lastClosedChallenge.id) : Promise.resolve([]),
        ]);
        if (!mounted) return;
        setLeaderboard(board.status === "fulfilled" ? board.value : []);
        setTopThree(top3.status === "fulfilled" ? top3.value : []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar o desafio");
      }
    }

    return () => {
      mounted = false;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;

    function handleBackendChange() {
      refreshRankings().catch(() => {
        // atualizacao em segundo plano: falha aqui nao deve interromper a tela atual
      });
    }

    async function refreshRankings() {
      const [workoutDaysBoard, distanceBoard, caloriesBoard, dietDaysBoard] =
        await Promise.allSettled([
          getWorkoutDaysLeaderboard(),
          getDistanceLeaderboard(),
          getCaloriesLeaderboard(),
          getDietDaysLeaderboard(),
        ]);
      if (workoutDaysBoard.status === "fulfilled") setWorkoutDays(workoutDaysBoard.value);
      if (distanceBoard.status === "fulfilled") setDistance(distanceBoard.value);
      if (caloriesBoard.status === "fulfilled") setCaloriesBurned(caloriesBoard.value);
      if (dietDaysBoard.status === "fulfilled") setDietDays(dietDaysBoard.value);
      await refreshLeaderboard();
    }

    window.addEventListener(CHANGE_EVENT, handleBackendChange);
    return () => window.removeEventListener(CHANGE_EVENT, handleBackendChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, challenge]);

  async function refreshLeaderboard() {
    if (!challenge) return;
    const board = await getLeaderboard(challenge.id);
    setLeaderboard(board);
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isAdmin && challenge && (
        <AdminParticipantsCard
          challengeId={challenge.id}
          currentUserId={user?.id ?? ""}
          onSaved={refreshLeaderboard}
        />
      )}

      <ChallengeCard
        title="Dias ativos"
        description="Quem registrou atividade fisica em mais dias neste mes."
        icon={<CalendarCheck className="size-4 text-primary" />}
        entries={workoutDays}
        currentUserId={user?.id ?? ""}
        emptyMessage="Ninguem registrou treino este mes ainda."
        renderValue={(entry) => (
          <Badge variant="default">
            {entry.activeDays} dia{entry.activeDays === 1 ? "" : "s"}
          </Badge>
        )}
      />

      <ChallengeCard
        title="Distancia"
        description="Quem caminhou e correu a maior distancia neste mes."
        icon={<Footprints className="size-4 text-primary" />}
        entries={distance}
        currentUserId={user?.id ?? ""}
        emptyMessage="Ninguem registrou corrida ou caminhada este mes ainda."
        renderValue={(entry) => (
          <Badge variant="default">{formatDistance(entry.distanceMeters)}</Badge>
        )}
      />

      <ChallengeCard
        title="Calorias queimadas"
        description="Quem queimou mais calorias em treinos neste mes."
        icon={<Flame className="size-4 text-primary" />}
        entries={caloriesBurned}
        currentUserId={user?.id ?? ""}
        emptyMessage="Nenhum treino com calorias registrado este mes ainda."
        renderValue={(entry) => (
          <Badge variant="default">{Math.round(entry.calories).toLocaleString("pt-BR")} kcal</Badge>
        )}
      />

      <ChallengeCard
        title="Peso perdido"
        description="Quem perdeu o maior percentual de peso no desafio do mes."
        icon={<Scale className="size-4 text-primary" />}
        entries={leaderboard}
        currentUserId={user?.id ?? ""}
        emptyMessage="Ninguem registrou o peso final ainda. Quando os participantes registrarem, o ranking aparece aqui."
        renderValue={(entry) => (
          <Badge variant={entry.pctLoss > 0 ? "default" : "secondary"}>
            {entry.pctLoss > 0 ? "-" : ""}
            {Math.abs(entry.pctLoss).toFixed(1)}%
          </Badge>
        )}
      />

      <ChallengeCard
        title="Refeicoes"
        description="Quem registrou refeicoes em mais dias neste mes."
        icon={<UtensilsCrossed className="size-4 text-primary" />}
        entries={dietDays}
        currentUserId={user?.id ?? ""}
        emptyMessage="Ninguem registrou refeicao este mes ainda."
        renderValue={(entry) => (
          <Badge variant="default">
            {entry.activeDays} dia{entry.activeDays === 1 ? "" : "s"}
          </Badge>
        )}
      />

      <PodiumCard topThree={topThree} />
    </div>
  );
}
