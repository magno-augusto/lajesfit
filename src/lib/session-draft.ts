// Rascunhos de formulario em sessionStorage: sobrevivem ao descarte da
// aba/PWA pelo Android (o Chrome restaura o sessionStorage ao restaurar a
// aba) e sao limpos pelo navegador quando o usuario fecha a guia ou remove
// o app das recentes — exatamente a semantica de "voltar onde parou".

type DraftEnvelope<T> = {
  v: number;
  savedAt: number;
  draft: T;
};

export function readDraft<T>(key: string, version: number, ttlMs: number): T | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const envelope = JSON.parse(raw) as Partial<DraftEnvelope<T>>;
    if (
      envelope.v !== version ||
      typeof envelope.savedAt !== "number" ||
      envelope.draft == null ||
      Date.now() - envelope.savedAt > ttlMs
    ) {
      sessionStorage.removeItem(key);
      return null;
    }
    return envelope.draft;
  } catch {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // sessionStorage indisponivel: segue sem rascunho
    }
    return null;
  }
}

export function writeDraft<T>(key: string, version: number, draft: T): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const envelope: DraftEnvelope<T> = { v: version, savedAt: Date.now(), draft };
  try {
    sessionStorage.setItem(key, JSON.stringify(envelope));
    return true;
  } catch {
    // quota estourada (ex.: foto grande demais): o chamador decide o fallback
    return false;
  }
}

export function clearDraft(key: string) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // sessionStorage indisponivel: nada a limpar
  }
}
