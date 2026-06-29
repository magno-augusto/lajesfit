import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreatePostDialog } from "./CreatePostDialog";
import { PostCard } from "./PostCard";
import { deletePost, fetchFeed, FEED_PAGE_SIZE, markPostsViewed, type FeedPost } from "./feed-api";
import { useLocalAuth } from "@/features/auth/auth";
import { consumePendingNewAction, NEW_ACTION_EVENT } from "@/components/new-action-menu";
import { CHANGE_EVENT } from "@/features/fitness/change-event";

export function FeedPage() {
  const { user, loading: authLoading } = useLocalAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const pendingViewIdsRef = useRef<Set<string>>(new Set());
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPosts([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    loadFeed(user.id).finally(() => {
      if (mounted) setLoading(false);
    });

    async function loadFeed(currentUserId: string) {
      return fetchFeed(currentUserId)
        .then((nextPosts) => {
          if (!mounted) return;
          setPosts(nextPosts);
          setHasMore(nextPosts.length === FEED_PAGE_SIZE);
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar o feed");
        });
    }

    return () => {
      mounted = false;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (consumePendingNewAction("post")) setCreatePostOpen(true);

    function handleNewAction(event: Event) {
      if ((event as CustomEvent).detail === "post") setCreatePostOpen(true);
    }

    window.addEventListener(NEW_ACTION_EVENT, handleNewAction);
    return () => window.removeEventListener(NEW_ACTION_EVENT, handleNewAction);
  }, []);

  function flushPendingViews() {
    if (!user || pendingViewIdsRef.current.size === 0) return;
    const ids = Array.from(pendingViewIdsRef.current);
    pendingViewIdsRef.current.clear();
    markPostsViewed(ids, user.id).catch(() => {
      // melhor esforco: nao bloqueia a navegacao do feed se falhar
    });
  }

  function observePost(element: HTMLElement | null, postId: string) {
    if (!element || seenIdsRef.current.has(postId)) return;

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const id = (entry.target as HTMLElement).dataset.postId;
            if (!id || seenIdsRef.current.has(id)) continue;

            seenIdsRef.current.add(id);
            pendingViewIdsRef.current.add(id);
            observerRef.current?.unobserve(entry.target);

            if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
            flushTimeoutRef.current = setTimeout(flushPendingViews, 800);
          }
        },
        { threshold: 0.5 },
      );
    }

    element.dataset.postId = postId;
    observerRef.current.observe(element);
  }

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
      flushPendingViews();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshFeed() {
    if (!user) return;
    const nextPosts = await fetchFeed(user.id);
    setPosts(nextPosts);
    setHasMore(nextPosts.length === FEED_PAGE_SIZE);
  }

  useEffect(() => {
    if (!user) return;

    function handleBackendChange() {
      refreshFeed().catch(() => {
        // atualizacao em segundo plano: falha aqui nao deve interromper o feed atual
      });
    }

    window.addEventListener(CHANGE_EVENT, handleBackendChange);
    return () => window.removeEventListener(CHANGE_EVENT, handleBackendChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadMore() {
    if (!user || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const nextPosts = await fetchFeed(user.id, { offset: posts.length });
      setPosts((current) => [...current, ...nextPosts]);
      setHasMore(nextPosts.length === FEED_PAGE_SIZE);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar mais posts");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleDeletePost(post: FeedPost) {
    if (!user || post.user_id !== user.id) return;

    await deletePost(post.id, user.id);
    setPosts((currentPosts) => currentPosts.filter((item) => item.id !== post.id));
    toast.success("Publicacao excluida");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {user && (
        <CreatePostDialog
          userId={user.id}
          onCreated={refreshFeed}
          open={createPostOpen}
          onOpenChange={setCreatePostOpen}
          showTrigger={false}
        />
      )}
      {loading ? (
        <div className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Carregando feed...
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum post publicado ainda
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <div key={post.id} ref={(element) => observePost(element, post.id)}>
              <PostCard post={post} currentUserId={user?.id ?? null} onDelete={handleDeletePost} />
            </div>
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Carregando..." : "Carregar mais"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
