import type { LocalMeal } from "./meals-api";

export type Meal = LocalMeal["meal"];

export const MEALS: { key: Meal; label: string }[] = [
  { key: "breakfast", label: "Cafe da manha" },
  { key: "lunch", label: "Almoco" },
  { key: "snack", label: "Lanche" },
  { key: "dinner", label: "Jantar" },
];
