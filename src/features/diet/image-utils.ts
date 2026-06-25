export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Nao foi possivel ler a imagem"));
    reader.readAsDataURL(file);
  });
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Nao foi possivel processar a imagem"));
    reader.readAsDataURL(blob);
  });
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nao foi possivel carregar a imagem"));
    image.src = src;
  });
}

export async function compressImageDataUrl(dataUrl: string) {
  const image = await loadImage(dataUrl);
  const maxSize = 1400;
  const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  return blob ? blobToDataUrl(blob) : dataUrl;
}

export function isOlderAndroidBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const androidMatch = ua.match(/Android\s(\d+)/i);
  const chromeMatch = ua.match(/Chrome\/(\d+)/i);
  const samsungMatch = ua.match(/SamsungBrowser\/(\d+)/i);

  const androidMajor = androidMatch ? Number(androidMatch[1]) : null;
  const chromeMajor = chromeMatch ? Number(chromeMatch[1]) : null;
  const samsungMajor = samsungMatch ? Number(samsungMatch[1]) : null;

  return Boolean(
    androidMajor !== null &&
    androidMajor <= 8 &&
    ((chromeMajor !== null && chromeMajor < 90) ||
      (samsungMajor !== null && samsungMajor < 14) ||
      chromeMajor === null),
  );
}

export async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}
