import { useEffect, useState } from "react";
import { CalendarCheck, Flame, Footprints, Scale, Trophy, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalAuth } from "@/features/auth/auth";
import { CHANGE_EVENT } from "@/features/fitness/change-event";
import { supabase } from "@/integrations/supabase/client";
import { ChallengeCard } from "./ChallengeCard";
import { PodiumCard } from "./PodiumCard";
import { PodiumEventsCard } from "./PodiumEventsCard";
import { PodiumShareDialog } from "./PodiumShareDialog";
import { getPendingPodiumEvents, getPodiumEvent, type PodiumEvent } from "./podium-events-api";
import {
  ensureChallengeLifecycle,
  getActiveChallenge,
  getActivityCountLeaderboard,
  getCaloriesLeaderboard,
  getDietDaysLeaderboard,
  getDistanceLeaderboard,
  getLastClosedChallenge,
  getLeaderboard,
  getTopThree,
  getWorkoutDaysLeaderboard,
  type ActivityCountEntry,
  type ActivityDaysEntry,
  type CaloriesEntry,
  type Challenge,
  type DistanceEntry,
  type LeaderboardEntry,
} from "./challenges-api";

// lucide nao tem icone de tenis: SVG proprio seguindo o estilo da biblioteca
function RunningShoeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M2 17v-5a2 2 0 0 1 2-2h4.6a1 1 0 0 1 .8.4l1.3 1.7a4 4 0 0 0 2.1 1.4l4.9 1.2a3 3 0 0 1 3.3 2.3" />
      <path d="M2 17a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2" />
      <path d="m10.5 12.5 1.5-1.5" />
      <path d="m12.5 14 1.5-1.5" />
    </svg>
  );
}

function formatDistance(meters: number) {
  const km = meters / 1000;
  return `${km.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function ChallengePage({ podiumEventId }: { podiumEventId?: string }) {
  const { user, loading: authLoading } = useLocalAuth();
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [topThree, setTopThree] = useState<LeaderboardEntry[]>([]);
  const [activityCount, setActivityCount] = useState<ActivityCountEntry[]>([]);
  const [workoutDays, setWorkoutDays] = useState<ActivityDaysEntry[]>([]);
  const [distance, setDistance] = useState<DistanceEntry[]>([]);
  const [caloriesBurned, setCaloriesBurned] = useState<CaloriesEntry[]>([]);
  const [dietDays, setDietDays] = useState<ActivityDaysEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [podiumEvents, setPodiumEvents] = useState<PodiumEvent[]>([]);
  const [activePodiumEvent, setActivePodiumEvent] = useState<PodiumEvent | null>(null);

  useEffect(() => {
    if (authLoading) return;

    let mounted = true;
    setLoading(true);

    load().finally(() => {
      if (mounted) setLoading(false);
    });

    async function load() {
      try {
        // lifecycle cria/fecha desafios: exige login; visitante apenas le os rankings
        if (user) await ensureChallengeLifecycle();
        // allSettled: a falha de um ranking nao pode esvaziar os demais cards
        const [
          active,
          lastClosed,
          activityCountBoard,
          workoutDaysBoard,
          distanceBoard,
          caloriesBoard,
          dietDaysBoard,
        ] = await Promise.allSettled([
          getActiveChallenge(),
          getLastClosedChallenge(),
          getActivityCountLeaderboard(),
          getWorkoutDaysLeaderboard(),
          getDistanceLeaderboard(),
          getCaloriesLeaderboard(),
          getDietDaysLeaderboard(),
        ]);
        if (!mounted) return;
        setChallenge(active.status === "fulfilled" ? active.value : null);
        setActivityCount(activityCountBoard.status === "fulfilled" ? activityCountBoard.value : []);
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
      const [activityCountBoard, workoutDaysBoard, distanceBoard, caloriesBoard, dietDaysBoard] =
        await Promise.allSettled([
          getActivityCountLeaderboard(),
          getWorkoutDaysLeaderboard(),
          getDistanceLeaderboard(),
          getCaloriesLeaderboard(),
          getDietDaysLeaderboard(),
        ]);
      if (activityCountBoard.status === "fulfilled") setActivityCount(activityCountBoard.value);
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

  // Podios pendentes de compartilhar: visiveis apenas para admins; o deep link
  // do push (?podio=<id>) abre o dialog do evento direto
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    async function loadPodiumEvents() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId!)
        .maybeSingle();
      if (!mounted || !profile?.is_admin) return;
      setIsAdmin(true);

      const [pending, deepLinked] = await Promise.allSettled([
        getPendingPodiumEvents(),
        podiumEventId ? getPodiumEvent(podiumEventId) : Promise.resolve(null),
      ]);
      if (!mounted) return;
      if (pending.status === "fulfilled") setPodiumEvents(pending.value);
      if (deepLinked.status === "fulfilled" && deepLinked.value) {
        setActivePodiumEvent(deepLinked.value);
      }
    }

    loadPodiumEvents().catch(() => {
      // melhor esforco: a falha aqui nao pode derrubar a pagina de rankings
    });
    return () => {
      mounted = false;
    };
  }, [userId, podiumEventId]);

  function handlePodiumShared() {
    getPendingPodiumEvents()
      .then(setPodiumEvents)
      .catch(() => {
        // melhor esforco: lista sera recarregada na proxima visita
      });
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long" });

  return (
    <div className="space-y-4">
      <section className="flex items-center gap-3 rounded-xl bg-gradient-hero p-5 text-primary-foreground shadow-glow">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <Trophy className="size-5.5" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl leading-none">Desafios do mes</h1>
          <p className="mt-1 text-sm text-primary-foreground/85">
            Rankings de {monthName} entre os participantes.
          </p>
        </div>
      </section>

      {/* Definicao de peso pelo admin oculta temporariamente (AdminParticipantsCard) */}

      {isAdmin && <PodiumEventsCard events={podiumEvents} onSelect={setActivePodiumEvent} />}
      {activePodiumEvent && (
        <PodiumShareDialog
          event={activePodiumEvent}
          open
          onOpenChange={(open) => {
            if (!open) setActivePodiumEvent(null);
          }}
          onShared={handlePodiumShared}
        />
      )}

      <ChallengeCard
        title="Atividades"
        description="Quem registrou mais atividades fisicas neste mes."
        icon={<RunningShoeIcon className="size-4 text-primary" />}
        entries={activityCount}
        currentUserId={user?.id ?? ""}
        emptyMessage="Ninguem registrou atividade este mes ainda."
        renderValue={(entry) => (
          <Badge variant="default">
            {entry.activities} treino{entry.activities === 1 ? "" : "s"}
          </Badge>
        )}
      />

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
