export function startOfLocalDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return startOfLocalDay(nextDate);
}

export function isSameLocalDate(isoDate: string, day: Date) {
  const date = new Date(isoDate);
  return isSameLocalDay(date, day);
}

export function isSameLocalDay(date: Date, day: Date) {
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatSelectedDate(date: Date) {
  const today = startOfLocalDay(new Date());
  const yesterday = addDays(today, -1);

  if (isSameLocalDay(date, today)) return `Hoje, ${formatShortDate(date)}`;
  if (isSameLocalDay(date, yesterday)) return `Ontem, ${formatShortDate(date)}`;

  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}
