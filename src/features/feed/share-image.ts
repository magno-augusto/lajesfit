import type { FeedPost } from "./feed-api";
import { formatDistance, formatDuration } from "./format";

export type ShareStat = { value: string; label: string };

const BRAND_PRIMARY = "#f95d0a"; // aproximacao solida do --primary (oklch)
const DISPLAY_FONT = '"Bebas Neue", "Archivo Black", system-ui, sans-serif';

// Extrai as estatisticas a exibir na imagem conforme o tipo do post.
export function getPostShareStats(post: FeedPost): ShareStat[] {
  if (post.workout) {
    const stats: ShareStat[] = [];
    if (post.workout.distance_meters) {
      stats.push({ value: formatDistance(post.workout.distance_meters), label: "Distancia" });
    }
    if (post.workout.duration_seconds) {
      stats.push({ value: formatDuration(post.workout.duration_seconds), label: "Tempo" });
    }
    if (post.workout.calories) {
      stats.push({ value: `${Math.round(post.workout.calories)} kcal`, label: "Calorias" });
    }
    return stats;
  }

  if (post.type === "diet") {
    // O post de refeicao embute os totais no texto:
    // "Total: 320 kcal - 25.0P / 40.0C / 10.0G."
    const match = post.content.match(
      /Total:\s*(\d+)\s*kcal\s*-\s*([\d.]+)P\s*\/\s*([\d.]+)C\s*\/\s*([\d.]+)G/,
    );
    if (!match) return [];
    const [, kcal, protein, carbs, fat] = match;
    return [
      { value: `${kcal} kcal`, label: "Calorias" },
      { value: `${Math.round(Number(protein))}g`, label: "Proteina" },
      { value: `${Math.round(Number(carbs))}g`, label: "Carbo" },
      { value: `${Math.round(Number(fat))}g`, label: "Gordura" },
    ];
  }

  return [];
}

// Desenha a marca e as estatisticas sobre a foto do post, devolvendo um novo
// blob JPEG. Retorna null quando nao da para compor (ex: video) — nesse caso
// o chamador compartilha a midia original.
export async function buildShareImage(imageBlob: Blob, stats: ShareStat[]): Promise<Blob | null> {
  if (!imageBlob.type.startsWith("image/")) return null;

  try {
    const bitmap = await createImageBitmap(imageBlob);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const base = Math.min(width, height);
    const pad = Math.round(base * 0.05);
    const brandSize = Math.round(base * 0.075);

    // garante a fonte de display no canvas (falha silenciosa: cai na sans-serif)
    try {
      await document.fonts.load(`${brandSize}px ${DISPLAY_FONT}`);
    } catch {
      // fonte nao carregada — segue com fallback
    }

    // gradiente no topo para a marca
    const topGradient = ctx.createLinearGradient(0, 0, 0, brandSize * 2.2);
    topGradient.addColorStop(0, "rgba(0,0,0,0.55)");
    topGradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, width, brandSize * 2.2);

    // marca "LAJESFIT" no topo esquerdo, com "FIT" em laranja
    ctx.textBaseline = "top";
    ctx.font = `${brandSize}px ${DISPLAY_FONT}`;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = brandSize * 0.12;
    ctx.fillStyle = "#ffffff";
    ctx.fillText("LAJES", pad, pad);
    ctx.fillStyle = BRAND_PRIMARY;
    ctx.fillText("FIT", pad + ctx.measureText("LAJES").width, pad);
    ctx.shadowBlur = 0;

    if (stats.length > 0) {
      const valueSize = Math.round(base * 0.085);
      const labelSize = Math.round(base * 0.032);
      const overlayHeight = Math.round(valueSize + labelSize * 2.6 + pad * 1.6);

      // gradiente inferior para as estatisticas
      const bottomGradient = ctx.createLinearGradient(0, height - overlayHeight * 1.6, 0, height);
      bottomGradient.addColorStop(0, "rgba(0,0,0,0)");
      bottomGradient.addColorStop(1, "rgba(0,0,0,0.82)");
      ctx.fillStyle = bottomGradient;
      ctx.fillRect(0, height - overlayHeight * 1.6, width, overlayHeight * 1.6);

      const columnWidth = width / stats.length;
      const valueY = height - overlayHeight + pad * 0.4;
      const labelY = valueY + valueSize + labelSize * 0.4;

      ctx.textAlign = "center";
      stats.forEach((stat, index) => {
        const centerX = columnWidth * index + columnWidth / 2;
        ctx.font = `${valueSize}px ${DISPLAY_FONT}`;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(stat.value, centerX, valueY);
        ctx.font = `600 ${labelSize}px system-ui, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fillText(stat.label.toUpperCase(), centerX, labelY);
      });
      ctx.textAlign = "left";
    }

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    });
  } catch {
    return null;
  }
}
