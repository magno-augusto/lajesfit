import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaderboardEntry } from "./challenges-api";

const PODIUM_ORDER = [1, 0, 2] as const; // 2o-1o-3o, como num podio
const PODIUM_HEIGHT = ["h-20", "h-28", "h-16"];

export function PodiumCard({ topThree }: { topThree: LeaderboardEntry[] }) {
  if (topThree.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Podio do desafio anterior</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-center gap-3">
          {PODIUM_ORDER.map((position) => {
            const entry = topThree[position];
            if (!entry) return <div key={position} className="w-20" />;
            return (
              <div key={entry.userId} className="flex w-20 flex-col items-center gap-2">
                <Avatar className="size-12 border-2 border-primary/30">
                  <AvatarImage src={entry.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-gradient-primary text-sm font-semibold text-primary-foreground">
                    {entry.displayName.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="w-full truncate text-center text-xs font-medium">
                  {entry.displayName}
                </span>
                <div
                  className={`flex w-full items-center justify-center rounded-t-lg bg-gradient-hero font-display text-2xl text-primary-foreground shadow-card ${PODIUM_HEIGHT[position]}`}
                >
                  {entry.rank}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
