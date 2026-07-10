import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BOARD_LABELS } from "./board-meta";
import type { PodiumEvent } from "./podium-events-api";

// Card exclusivo do admin: podios pendentes de compartilhar no grupo
export function PodiumEventsCard({
  events,
  onSelect,
}: {
  events: PodiumEvent[];
  onSelect: (event: PodiumEvent) => void;
}) {
  if (events.length === 0) return null;

  return (
    <Card className="border-primary/10 bg-gradient-to-b from-card to-primary/5">
      <CardHeader className="p-5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Share2 className="size-4 text-primary" />
          </span>
          Podios para compartilhar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-5 pt-0">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {BOARD_LABELS[event.board] ?? event.board}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Novo lider: {event.top3[0]?.displayName ?? "—"} ·{" "}
                {new Date(`${event.eventDate}T12:00:00`).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </p>
            </div>
            <Button size="sm" onClick={() => onSelect(event)}>
              <Share2 className="size-3.5" />
              Compartilhar
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
