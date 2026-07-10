// Metadados dos rankings mensais: label e formatacao do valor por board.
// Modulo puro (sem imports) para poder ser usado tanto na UI quanto no server.

export const BOARD_LABELS: Record<string, string> = {
  activities: "Atividades",
  workout_days: "Dias ativos",
  distance: "Distancia",
  calories: "Calorias queimadas",
  diet_days: "Refeicoes",
};

export function formatBoardValue(board: string, value: number): string {
  switch (board) {
    case "distance": {
      const km = value / 1000;
      return `${km.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
    }
    case "calories":
      return `${Math.round(value).toLocaleString("pt-BR")} kcal`;
    case "activities":
      return `${value} treino${value === 1 ? "" : "s"}`;
    default:
      // workout_days e diet_days contam dias distintos
      return `${value} dia${value === 1 ? "" : "s"}`;
  }
}
