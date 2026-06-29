import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type RankedEntry = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  rank: number;
};

export function RankingList<T extends RankedEntry>({
  entries,
  currentUserId,
  emptyMessage,
  renderValue,
}: {
  entries: T[];
  currentUserId: string;
  emptyMessage: string;
  renderValue: (entry: T) => ReactNode;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
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
            {renderValue(entry)}
          </li>
        );
      })}
    </ul>
  );
}
