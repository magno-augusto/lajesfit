import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalAuth } from "@/features/auth/auth";
import { CHANGE_EVENT } from "@/features/fitness/change-event";
import { supabase } from "@/integrations/supabase/client";
import { AdminParticipantsCard } from "./AdminParticipantsCard";
import { PodiumCard } from "./PodiumCard";
import { RankingList } from "./RankingList";
import {
  ensureChallengeLifecycle,
  getActiveChallenge,
  getDietDaysLeaderboard,
  getLastClosedChallenge,
  getLeaderboard,
  getTopThree,
  getWorkoutDaysLeaderboard,
  type ActivityDaysEntry,
  type Challenge,
  type LeaderboardEntry,
} from "./challenges-api";

type TabKey = "weight" | "workouts" | "diet";

export function ChallengePage() {
  const { user, loading: authLoading } = useLocalAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [topThree, setTopThree] = useState<LeaderboardEntry[]>([]);
  const [workoutDays, setWorkoutDays] = useState<ActivityDaysEntry[]>([]);
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
        const [active, lastClosed, workoutDaysBoard, dietDaysBoard] = await Promise.all([
          getActiveChallenge(),
          getLastClosedChallenge(),
          getWorkoutDaysLeaderboard(),
          getDietDaysLeaderboard(),
        ]);
        if (!mounted) return;
        setChallenge(active);
        setWorkoutDays(workoutDaysBoard);
        setDietDays(dietDaysBoard);

        const [board, top3] = await Promise.all([
          active ? getLeaderboard(active.id) : Promise.resolve([]),
          lastClosed ? getTopThree(lastClosed.id) : Promise.resolve([]),
        ]);
        if (!mounted) return;
        setLeaderboard(board);
        setTopThree(top3);
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
      const [workoutDaysBoard, dietDaysBoard] = await Promise.all([
        getWorkoutDaysLeaderboard(),
        getDietDaysLeaderboard(),
      ]);
      setWorkoutDays(workoutDaysBoard);
      setDietDays(dietDaysBoard);
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

  const tabOrder = useMemo<TabKey[]>(() => {
    return leaderboard.length > 0
      ? ["weight", "workouts", "diet"]
      : ["workouts", "diet", "weight"];
  }, [leaderboard.length]);

  const tabLabels: Record<TabKey, string> = {
    weight: "Peso perdido",
    workouts: "Dias ativos",
    diet: "Refeicoes",
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!challenge) {
    return <p className="text-sm text-muted-foreground">Nenhum desafio disponivel agora.</p>;
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <AdminParticipantsCard
          challengeId={challenge.id}
          currentUserId={user?.id ?? ""}
          onSaved={refreshLeaderboard}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ranking</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={tabOrder[0]}>
            <TabsList className="grid w-full grid-cols-3">
              {tabOrder.map((key) => (
                <TabsTrigger key={key} value={key}>
                  {tabLabels[key]}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="weight" className="mt-4">
              <RankingList
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
            </TabsContent>

            <TabsContent value="workouts" className="mt-4">
              <RankingList
                entries={workoutDays}
                currentUserId={user?.id ?? ""}
                emptyMessage="Ninguem registrou treino este mes ainda."
                renderValue={(entry) => (
                  <Badge variant="default">
                    {entry.activeDays} dia{entry.activeDays === 1 ? "" : "s"}
                  </Badge>
                )}
              />
            </TabsContent>

            <TabsContent value="diet" className="mt-4">
              <RankingList
                entries={dietDays}
                currentUserId={user?.id ?? ""}
                emptyMessage="Ninguem registrou refeicao este mes ainda."
                renderValue={(entry) => (
                  <Badge variant="default">
                    {entry.activeDays} dia{entry.activeDays === 1 ? "" : "s"}
                  </Badge>
                )}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <PodiumCard topThree={topThree} />
    </div>
  );
}
