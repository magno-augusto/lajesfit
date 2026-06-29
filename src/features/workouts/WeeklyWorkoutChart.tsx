import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
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
    <div className="p-3">
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        Calorias queimadas nos ultimos 7 dias
      </p>
      <ChartContainer config={chartConfig} className="h-28 w-full">
        <BarChart data={data} margin={{ top: 16 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <Bar dataKey="calories" fill="var(--color-calories)" radius={4}>
            <LabelList dataKey="calories" position="top" fontSize={11} />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
