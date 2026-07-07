import { FEED_PAGE_SIZE, type FeedPost } from "./feed-api";

// Snapshot da primeira pagina do feed em localStorage: ao voltar para a tela,
// as publicacoes anteriores aparecem na hora enquanto a busca real roda em
// background (stale-while-revalidate). Sobrevive ao fechamento do app/TWA.

const FEED_CACHE_PREFIX = "lajesfit-feed-cache:";
const FEED_CACHE_VERSION = 1;
const FEED_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type FeedCacheEnvelope = {
  v: number;
  savedAt: number;
  posts: FeedPost[];
};

function cacheKey(userId: string) {
  return `${FEED_CACHE_PREFIX}${userId}`;
}

export function readFeedCache(userId: string): FeedPost[] | null {
  if (typeof localStorage === "undefined") return null;
  const key = cacheKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const envelope = JSON.parse(raw) as Partial<FeedCacheEnvelope>;
    if (
      envelope.v !== FEED_CACHE_VERSION ||
      typeof envelope.savedAt !== "number" ||
      !Array.isArray(envelope.posts) ||
      Date.now() - envelope.savedAt > FEED_CACHE_TTL_MS
    ) {
      localStorage.removeItem(key);
      return null;
    }
    return envelope.posts;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function writeFeedCache(userId: string, posts: FeedPost[]) {
  if (typeof localStorage === "undefined") return;
  const envelope: FeedCacheEnvelope = {
    v: FEED_CACHE_VERSION,
    savedAt: Date.now(),
    posts: posts.slice(0, FEED_PAGE_SIZE),
  };
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(envelope));
  } catch {
    // quota estourada: remove o snapshot e segue sem cache
    try {
      localStorage.removeItem(cacheKey(userId));
    } catch {
      // localStorage indisponivel: o feed funciona normalmente sem cache
    }
  }
}
