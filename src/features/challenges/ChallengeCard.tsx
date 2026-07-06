import { useState, type ReactNode } from "react";
import { ChevronRight, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Podium } from "./Podium";
import { RankingList } from "./RankingList";

type RankedEntry = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  rank: number;
};

// selo da posicao, indexado pela posicao no ranking (0 = 1o lugar)
const MEDAL_CHIP = ["bg-gradient-gold", "bg-gradient-silver", "bg-gradient-bronze"];

export function ChallengeCard<T extends RankedEntry>({
  title,
  description,
  icon,
  entries,
  currentUserId,
  emptyMessage,
  renderValue,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  entries: T[];
  currentUserId: string;
  emptyMessage: string;
  renderValue: (entry: T) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const topThree = entries.slice(0, 3);
  const others = entries.slice(3);

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="cursor-pointer border-primary/10 bg-gradient-to-b from-card to-primary/5 transition-shadow hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {icon}
            </span>
            <span className="flex-1">{title}</span>
            <span className="flex items-center gap-0.5 rounded-full bg-primary/10 py-0.5 pl-2 pr-1 text-xs font-medium text-primary">
              Ver todos <ChevronRight className="size-3.5" />
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          {topThree.length === 0 ? (
            <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            <ul className="space-y-1">
              {topThree.map((entry, index) => {
                const isMe = entry.userId === currentUserId;
                return (
                  <li
                    key={entry.userId}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                      isMe ? "bg-muted/70" : "bg-muted/40"
                    }`}
                  >
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full font-display text-xs text-white shadow-card ${MEDAL_CHIP[index]}`}
                    >
                      {entry.rank}
                    </span>
                    <Avatar className="size-7 border border-primary/20">
                      <AvatarImage src={entry.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-gradient-primary text-[11px] font-semibold text-primary-foreground">
                        {entry.displayName.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {index === 0 && (
                        <Crown
                          aria-hidden
                          className="mr-1 inline size-3.5 -translate-y-px fill-medal-gold text-medal-gold"
                        />
                      )}
                      {entry.displayName}
                      {isMe && <span className="text-muted-foreground"> (voce)</span>}
                    </span>
                    {renderValue(entry)}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <div className="space-y-4">
              <Podium topThree={topThree} currentUserId={currentUserId} renderValue={renderValue} />
              {others.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Demais colocacoes
                  </h3>
                  <RankingList
                    entries={others}
                    currentUserId={currentUserId}
                    emptyMessage={emptyMessage}
                    renderValue={renderValue}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
