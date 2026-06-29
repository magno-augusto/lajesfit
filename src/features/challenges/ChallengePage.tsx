import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalAuth } from "@/features/auth/auth";
import { ChallengeLeaderboard } from "./ChallengeLeaderboard";
import { PodiumCard } from "./PodiumCard";
import { WeightDialog } from "./WeightDialog";
import {
  ensureChallengeLifecycle,
  getActiveChallenge,
  getLastClosedChallenge,
  getLeaderboard,
  getMyParticipation,
  getTopThree,
  joinChallenge,
  logFinalWeight,
  type Challenge,
  type ChallengeParticipant,
  type LeaderboardEntry,
} from "./challenges-api";

// period_start/period_end vem do banco como "YYYY-MM-DD" (coluna DATE, sem hora).
// new Date("YYYY-MM-DD") interpreta como UTC meia-noite, o que desloca um dia para
// tras em fusos negativos (ex: Brasil) ao formatar/comparar em horario local.
function parseLocalDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatPeriod(challenge: Challenge) {
  const start = parseLocalDate(challenge.periodStart).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  const end = parseLocalDate(challenge.periodEnd).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  return `${start} a ${end}`;
}

function daysRemaining(challenge: Challenge) {
  const end = parseLocalDate(challenge.periodEnd);
  end.setHours(23, 59, 59, 999);
  const diff = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function ChallengePage() {
  const { user, loading: authLoading } = useLocalAuth();
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participation, setParticipation] = useState<ChallengeParticipant | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [topThree, setTopThree] = useState<LeaderboardEntry[]>([]);

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
        const [active, lastClosed] = await Promise.all([
          getActiveChallenge(),
          getLastClosedChallenge(),
        ]);
        if (!mounted) return;
        setChallenge(active);

        const [myParticipation, board, top3] = await Promise.all([
          active ? getMyParticipation(active.id) : Promise.resolve(null),
          active ? getLeaderboard(active.id) : Promise.resolve([]),
          lastClosed ? getTopThree(lastClosed.id) : Promise.resolve([]),
        ]);
        if (!mounted) return;
        setParticipation(myParticipation);
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

  async function refreshLeaderboard() {
    if (!challenge) return;
    const board = await getLeaderboard(challenge.id);
    setLeaderboard(board);
  }

  async function handleJoin(weightKg: number) {
    if (!challenge) return;
    await joinChallenge(challenge.id, weightKg);
    const myParticipation = await getMyParticipation(challenge.id);
    setParticipation(myParticipation);
    toast.success("Voce entrou no desafio!");
  }

  async function handleLogFinalWeight(weightKg: number) {
    if (!participation) return;
    await logFinalWeight(participation.id, weightKg);
    setParticipation({ ...participation, endWeightKg: weightKg });
    await refreshLeaderboard();
    toast.success("Peso final registrado!");
  }

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

  const remaining = daysRemaining(challenge);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Desafio do mes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Periodo: {formatPeriod(challenge)} ({remaining} dia(s) restante(s))
          </p>

          {!participation && (
            <WeightDialog
              triggerLabel="Participar do desafio"
              title="Entrar no desafio"
              description="Informe seu peso atual para comecar. Ele sera usado apenas para calcular sua evolucao no final do periodo."
              confirmLabel="Confirmar entrada"
              onConfirm={handleJoin}
            />
          )}

          {participation && participation.endWeightKg === null && (
            <WeightDialog
              triggerLabel="Registrar peso final"
              title="Registrar peso final"
              description="Informe seu peso atual para fechar sua participacao neste desafio."
              confirmLabel="Salvar peso final"
              onConfirm={handleLogFinalWeight}
            />
          )}

          {participation && participation.endWeightKg !== null && (
            <p className="text-sm font-medium text-primary">
              Voce ja registrou seu peso final. Aguarde o fim do desafio para ver o resultado.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ranking</CardTitle>
        </CardHeader>
        <CardContent>
          <ChallengeLeaderboard entries={leaderboard} currentUserId={user?.id ?? ""} />
        </CardContent>
      </Card>

      <PodiumCard topThree={topThree} />
    </div>
  );
}
