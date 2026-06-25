import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { isSameLocalDate } from "@/lib/date";
import type { LocalMeal } from "./meals-api";

const chartConfig: ChartConfig = {
  calories: { label: "Calorias", color: "hsl(var(--primary))" },
};

function lastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
}

export function WeeklyCalorieChart({
  meals,
  dailyTarget,
}: {
  meals: LocalMeal[];
  dailyTarget: number;
}) {
  const data = lastSevenDays().map((day) => {
    const calories = meals
      .filter((meal) => isSameLocalDate(meal.createdAt, day))
      .reduce((sum, meal) => sum + meal.calories, 0);
    return {
      label: day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      calories: Math.round(calories),
    };
  });

  return (
    <div className="rounded-lg border bg-card p-4 shadow-card">
      <p className="mb-2 text-sm font-medium text-muted-foreground">Calorias nos ultimos 7 dias</p>
      <ChartContainer config={chartConfig} className="h-40 w-full">
        <BarChart data={data}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          {dailyTarget > 0 && (
            <ReferenceLine y={dailyTarget} stroke="var(--color-calories)" strokeDasharray="4 4" />
          )}
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="calories" fill="var(--color-calories)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
