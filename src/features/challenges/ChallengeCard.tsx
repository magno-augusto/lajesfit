import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RankingList } from "./RankingList";

type RankedEntry = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  rank: number;
};

const PODIUM_ORDER = [1, 0, 2] as const; // 2o-1o-3o, como num podio
const PODIUM_HEIGHT = ["h-16", "h-24", "h-12"];

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
        className="cursor-pointer transition-shadow hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            <span className="flex-1">{title}</span>
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              Ver todos <ChevronRight className="size-3.5" />
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent>
          {topThree.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <div className="flex items-end justify-center gap-3">
              {PODIUM_ORDER.map((position) => {
                const entry = topThree[position];
                if (!entry) return <div key={position} className="w-24" />;
                const isMe = entry.userId === currentUserId;
                return (
                  <div key={entry.userId} className="flex w-24 flex-col items-center gap-1.5">
                    <Avatar className="size-11 border-2 border-primary/30">
                      <AvatarImage src={entry.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-gradient-primary text-sm font-semibold text-primary-foreground">
                        {entry.displayName.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="w-full truncate text-center text-xs font-medium">
                      {entry.displayName}
                      {isMe && <span className="text-muted-foreground"> (voce)</span>}
                    </span>
                    {renderValue(entry)}
                    <div
                      className={`flex w-full items-center justify-center rounded-t-lg bg-gradient-hero font-display text-xl text-primary-foreground shadow-card ${PODIUM_HEIGHT[position]}`}
                    >
                      {entry.rank}
                    </div>
                  </div>
                );
              })}
            </div>
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
          </DialogHeader>
          <RankingList
            entries={entries}
            currentUserId={currentUserId}
            emptyMessage={emptyMessage}
            renderValue={renderValue}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
