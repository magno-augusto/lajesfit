import { Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Podium } from "./Podium";
import type { LeaderboardEntry } from "./challenges-api";

export function PodiumCard({ topThree }: { topThree: LeaderboardEntry[] }) {
  if (topThree.length === 0) return null;

  return (
    <Card className="border-primary/10 bg-gradient-to-b from-card to-primary/5">
      <CardHeader className="p-5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Medal className="size-4 text-primary" />
          </span>
          Podio do desafio anterior
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <Podium topThree={topThree} />
      </CardContent>
    </Card>
  );
}
