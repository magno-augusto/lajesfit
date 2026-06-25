import type { LocalMeal } from "./meals-api";

export type MealGroup = {
  id: string;
  dietMealId: string | null;
  meal: LocalMeal["meal"];
  photoUrl: string | null;
  items: LocalMeal[];
};

export function groupMealEntries(entries: LocalMeal[]) {
  const groups = new Map<string, MealGroup>();

  entries.forEach((entry) => {
    const key = entry.dietMealId ?? `legacy:${entry.id}`;
    const current = groups.get(key);
    if (current) {
      current.items.push(entry);
      current.photoUrl = current.photoUrl ?? entry.mealPhotoUrl ?? entry.photoUrl;
      return;
    }

    groups.set(key, {
      id: key,
      dietMealId: entry.dietMealId,
      meal: entry.meal,
      photoUrl: entry.mealPhotoUrl ?? entry.photoUrl,
      items: [entry],
    });
  });

  return Array.from(groups.values());
}
