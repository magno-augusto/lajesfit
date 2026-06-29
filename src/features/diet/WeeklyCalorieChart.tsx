import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, XAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
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
    <div className="p-3">
      <p className="mb-2 text-sm font-medium text-muted-foreground">Calorias na semana</p>
      <ChartContainer config={chartConfig} className="h-28 w-full">
        <BarChart data={data} margin={{ top: 16 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          {dailyTarget > 0 && (
            <ReferenceLine y={dailyTarget} stroke="var(--color-calories)" strokeDasharray="4 4" />
          )}
          <Bar dataKey="calories" fill="var(--color-calories)" radius={4}>
            <LabelList dataKey="calories" position="top" fontSize={11} />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
