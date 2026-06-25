import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { isSameLocalDate } from "@/lib/date";
import type { LocalWorkout } from "./workouts-api";

const chartConfig: ChartConfig = {
  calories: { label: "Calorias queimadas", color: "hsl(var(--primary))" },
};

function lastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
}

export function WeeklyWorkoutChart({ workouts }: { workouts: LocalWorkout[] }) {
  const data = lastSevenDays().map((day) => {
    const calories = workouts
      .filter((workout) => isSameLocalDate(workout.startedAt, day))
      .reduce((sum, workout) => sum + (workout.calories ?? 0), 0);
    return {
      label: day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      calories: Math.round(calories),
    };
  });

  return (
    <div className="rounded-lg border bg-card p-4 shadow-card">
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        Calorias queimadas nos ultimos 7 dias
      </p>
      <ChartContainer config={chartConfig} className="h-40 w-full">
        <BarChart data={data}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="calories" fill="var(--color-calories)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
