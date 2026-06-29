import { CalorieRing } from "./CalorieRing";

export function DailySummaryCard({
  consumed,
  target,
  burned,
  protein,
  carbs,
  fat,
}: {
  consumed: number;
  target: number;
  burned: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-card">
      <CalorieRing consumed={consumed} target={target} burned={burned} />
      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <Macro label="Proteina" value={protein} unit="g" />
        <Macro label="Carboidrato" value={carbs} unit="g" />
        <Macro label="Gordura" value={fat} unit="g" />
      </div>
    </div>
  );
}

function Macro({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="bg-muted rounded-lg p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-display text-lg">
        {value.toFixed(1)}
        <span className="text-xs font-sans ml-1 text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}
