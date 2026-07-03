import React from "react";
import { Flame } from "lucide-react";

const SIZE = 116;
const STROKE = 10;

function PacManIcon({ className }: { className?: string }) {
  // Lucide nao tem pac-man: circulo com "boca" aberta para a direita
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 12 L20.66 7 A10 10 0 1 0 20.66 17 Z" />
    </svg>
  );
}
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CalorieRing({
  consumed,
  target,
  burned,
  burnedSlot,
}: {
  consumed: number;
  target: number;
  burned: number;
  burnedSlot?: React.ReactNode;
}) {
  const remaining = Math.round(target - consumed + burned);
  const percent = target > 0 ? Math.min(100, Math.max(0, (consumed / target) * 100)) : 0;
  const offset = CIRCUMFERENCE * (1 - percent / 100);

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="min-w-0 flex-1 text-center">
        <PacManIcon className="mx-auto mb-0.5 size-4 text-primary" />
        <p className="truncate text-xs text-muted-foreground">Consumidas</p>
        <p className="font-display text-xl">{Math.round(consumed)}</p>
      </div>

      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-muted"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            className="stroke-primary transition-[stroke-dashoffset] duration-300"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-3xl leading-none">{remaining}</p>
          <p className="text-xs text-muted-foreground">Restantes</p>
        </div>
      </div>

      <div className="min-w-0 flex-1 text-center">
        {burnedSlot}
        <Flame className="mx-auto mb-0.5 size-4 text-primary" />
        <p className="truncate text-xs text-muted-foreground">Queimadas</p>
        <p className="font-display text-xl">{Math.round(burned)}</p>
      </div>
    </div>
  );
}
