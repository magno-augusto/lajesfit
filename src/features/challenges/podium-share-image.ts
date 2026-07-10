import { BOARD_LABELS, formatBoardValue } from "./board-meta";
import type { PodiumEntry, PodiumEvent } from "./podium-events-api";

const BRAND_PRIMARY = "#f95d0a"; // aproximacao solida do --primary (oklch)
const DISPLAY_FONT = '"Bebas Neue", "Archivo Black", system-ui, sans-serif';

const WIDTH = 1080;
const HEIGHT = 1350;

// indexado pela posicao no ranking (0 = 1o lugar): ouro, prata e bronze
const MEDAL = [
  { top: "#fbbf24", bottom: "#b45309", step: 300, avatar: 100 },
  { top: "#e5e7eb", bottom: "#9ca3af", step: 210, avatar: 80 },
  { top: "#d08744", bottom: "#8a4b1d", step: 160, avatar: 80 },
];
const PODIUM_ORDER = [1, 0, 2] as const; // 2o-1o-3o, como num podio

async function loadAvatar(url: string | null): Promise<ImageBitmap | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await createImageBitmap(blob);
  } catch {
    // avatar externo pode bloquear CORS: cai no circulo com a inicial
    return null;
  }
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  entry: PodiumEntry,
  bitmap: ImageBitmap | null,
  centerX: number,
  centerY: number,
  radius: number,
  borderColor: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();
  if (bitmap) {
    // cover: preenche o circulo mantendo a proporcao
    const scale = (radius * 2) / Math.min(bitmap.width, bitmap.height);
    const drawWidth = bitmap.width * scale;
    const drawHeight = bitmap.height * scale;
    ctx.drawImage(bitmap, centerX - drawWidth / 2, centerY - drawHeight / 2, drawWidth, drawHeight);
  } else {
    const gradient = ctx.createLinearGradient(
      centerX - radius,
      centerY - radius,
      centerX + radius,
      centerY + radius,
    );
    gradient.addColorStop(0, BRAND_PRIMARY);
    gradient.addColorStop(1, "#c2410c");
    ctx.fillStyle = gradient;
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.round(radius)}px ${DISPLAY_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(entry.displayName.slice(0, 1).toUpperCase(), centerX, centerY + radius * 0.06);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.lineWidth = 8;
  ctx.strokeStyle = borderColor;
  ctx.stroke();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

// Desenha o podio (top 3) de um evento de troca de lider e devolve um JPEG
// pronto para compartilhar no WhatsApp.
export async function buildPodiumImage(event: PodiumEvent): Promise<Blob | null> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // garante a fonte de display no canvas (falha silenciosa: cai na sans-serif)
    try {
      await document.fonts.load(`120px ${DISPLAY_FONT}`);
    } catch {
      // fonte nao carregada — segue com fallback
    }

    const avatars = await Promise.all(event.top3.map((entry) => loadAvatar(entry.avatarUrl)));

    // fundo escuro com glow laranja atras do 1o lugar
    const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    background.addColorStop(0, "#1c1917");
    background.addColorStop(1, "#0c0a09");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const glow = ctx.createRadialGradient(WIDTH / 2, 820, 0, WIDTH / 2, 820, 560);
    glow.addColorStop(0, "rgba(249,93,10,0.28)");
    glow.addColorStop(1, "rgba(249,93,10,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // marca "LAJESFIT" centralizada no topo
    ctx.textBaseline = "top";
    ctx.font = `64px ${DISPLAY_FONT}`;
    const brandLajes = ctx.measureText("LAJES").width;
    const brandFit = ctx.measureText("FIT").width;
    const brandX = (WIDTH - brandLajes - brandFit) / 2;
    ctx.fillStyle = "#ffffff";
    ctx.fillText("LAJES", brandX, 64);
    ctx.fillStyle = BRAND_PRIMARY;
    ctx.fillText("FIT", brandX + brandLajes, 64);

    // titulo e subtitulo
    ctx.textAlign = "center";
    ctx.font = `130px ${DISPLAY_FONT}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText("NOVO LIDER!", WIDTH / 2, 190);

    const label = BOARD_LABELS[event.board] ?? "do mes";
    const monthName = new Date(`${event.periodMonth}T12:00:00`).toLocaleDateString("pt-BR", {
      month: "long",
    });
    ctx.font = "600 42px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(`Desafio ${label} · ${monthName}`, WIDTH / 2, 350);

    // podio 2o-1o-3o
    const columnWidth = 300;
    const gap = 40;
    const startX = (WIDTH - columnWidth * 3 - gap * 2) / 2;
    const baseY = 1200;

    PODIUM_ORDER.forEach((position, columnIndex) => {
      const entry = event.top3[position];
      if (!entry) return;
      const medal = MEDAL[position];
      const centerX = startX + columnIndex * (columnWidth + gap) + columnWidth / 2;
      const stepTop = baseY - medal.step;

      // degrau com topo arredondado
      const step = ctx.createLinearGradient(0, stepTop, 0, baseY);
      step.addColorStop(0, medal.top);
      step.addColorStop(1, medal.bottom);
      ctx.fillStyle = step;
      ctx.beginPath();
      ctx.roundRect(centerX - columnWidth / 2, stepTop, columnWidth, medal.step, [24, 24, 0, 0]);
      ctx.fill();

      ctx.font = `96px ${DISPLAY_FONT}`;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.textBaseline = "middle";
      ctx.fillText(String(position + 1), centerX, stepTop + medal.step / 2 + 6);

      // valor e nome acima do degrau
      ctx.textBaseline = "alphabetic";
      ctx.font = "600 36px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText(formatBoardValue(event.board, entry.value), centerX, stepTop - 28);

      ctx.font = "700 44px system-ui, sans-serif";
      ctx.fillStyle = position === 0 ? BRAND_PRIMARY : "#ffffff";
      const name = truncate(ctx, entry.displayName, columnWidth + gap * 0.6);
      ctx.fillText(name, centerX, stepTop - 82);

      // avatar (e coroa no 1o lugar)
      const avatarCenterY = stepTop - 148 - medal.avatar;
      drawAvatar(ctx, entry, avatars[position], centerX, avatarCenterY, medal.avatar, medal.top);
      if (position === 0) {
        ctx.font = "84px system-ui, sans-serif";
        ctx.textBaseline = "alphabetic";
        ctx.fillText("👑", centerX, avatarCenterY - medal.avatar - 18);
      }
    });

    // rodape
    ctx.font = "500 30px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("lajesfit.vercel.app/desafio", WIDTH / 2, 1296);
    ctx.textAlign = "left";

    avatars.forEach((bitmap) => bitmap?.close());

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    });
  } catch {
    return null;
  }
}
