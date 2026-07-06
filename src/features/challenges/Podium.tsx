import type { ReactNode } from "react";
import { Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type RankedEntry = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  rank: number;
};

const PODIUM_ORDER = [1, 0, 2] as const; // 2o-1o-3o, como num podio
// indexado pela posicao no ranking (0 = 1o lugar): ouro, prata e bronze
const PODIUM_STYLE = [
  { height: "h-22", column: "bg-gradient-gold", border: "border-medal-gold" },
  { height: "h-16", column: "bg-gradient-silver", border: "border-medal-silver" },
  { height: "h-13", column: "bg-gradient-bronze", border: "border-medal-bronze" },
];

export function Podium<T extends RankedEntry>({
  topThree,
  currentUserId,
  renderValue,
}: {
  topThree: T[];
  currentUserId?: string;
  renderValue?: (entry: T) => ReactNode;
}) {
  return (
    <div className="flex items-end justify-center gap-2.5 overflow-hidden rounded-xl bg-muted/60 px-2 pt-3">
      {PODIUM_ORDER.map((position) => {
        const entry = topThree[position];
        if (!entry) return <div key={position} className="w-20" />;
        const style = PODIUM_STYLE[position];
        const isMe = Boolean(currentUserId) && entry.userId === currentUserId;
        return (
          <div key={entry.userId} className="flex w-20 flex-col items-center gap-1.5">
            {position === 0 && (
              <Crown
                aria-hidden
                className="-mb-1 size-5 fill-medal-gold text-medal-gold drop-shadow-sm"
              />
            )}
            <Avatar className={`size-10 border-2 ${style.border}`}>
              <AvatarImage src={entry.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-gradient-primary text-sm font-semibold text-primary-foreground">
                {entry.displayName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="w-full truncate text-center text-xs font-medium">
              {entry.displayName}
              {isMe && <span className="text-muted-foreground"> (voce)</span>}
            </span>
            {renderValue?.(entry)}
            <div
              className={`flex w-full items-center justify-center rounded-t-lg font-display text-xl text-white shadow-card ${style.column} ${style.height}`}
            >
              {entry.rank}
            </div>
          </div>
        );
      })}
    </div>
  );
}
