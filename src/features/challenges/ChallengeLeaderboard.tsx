import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { LeaderboardEntry } from "./challenges-api";

export function ChallengeLeaderboard({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  currentUserId: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ninguem registrou o peso final ainda. Quando os participantes registrarem, o ranking
        aparece aqui.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {entries.map((entry) => {
        const isMe = entry.userId === currentUserId;
        return (
          <li
            key={entry.userId}
            className={`flex items-center gap-3 p-3 ${isMe ? "bg-muted/50" : ""}`}
          >
            <span className="w-6 text-center font-display text-lg text-muted-foreground">
              {entry.rank}
            </span>
            <Avatar className="size-9 border border-primary/20">
              <AvatarImage src={entry.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-gradient-primary text-xs font-semibold text-primary-foreground">
                {entry.displayName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-sm font-medium">
              {entry.displayName}
              {isMe && <span className="text-muted-foreground"> (voce)</span>}
            </span>
            <Badge variant={entry.pctLoss > 0 ? "default" : "secondary"}>
              {entry.pctLoss > 0 ? "-" : ""}
              {Math.abs(entry.pctLoss).toFixed(1)}%
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
