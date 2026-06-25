export function parseOptionalNumber(
  value: string,
  label: string,
  options: { min?: number; max?: number } = {},
) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} precisa ser um numero valido`);
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`${label} precisa ser maior ou igual a ${options.min}`);
  }

  if (options.max !== undefined && parsed > options.max) {
    throw new Error(`${label} precisa ser no maximo ${options.max}`);
  }

  return parsed;
}

export function getVideoDuration(url: string) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => reject(new Error("Nao foi possivel ler o video"));
    video.src = url;
  });
}
