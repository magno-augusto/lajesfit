import React from "react";

const SIZE = 140;
const STROKE = 12;
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
    <div className="flex items-center justify-center gap-4">
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Consumidas</p>
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

      <div className="text-center">
        {burnedSlot}
        <p className="text-xs text-muted-foreground">Queimadas</p>
        <p className="font-display text-xl">{Math.round(burned)}</p>
      </div>
    </div>
  );
}
