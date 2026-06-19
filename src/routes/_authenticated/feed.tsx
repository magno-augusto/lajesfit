import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PostCard } from "@/components/post-card";
import { fetchFeed, type FeedPost } from "@/lib/feed";
import { useLocalAuth } from "@/lib/local-auth";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed - Lajes Fit" }] }),
  component: FeedPage,
});

function FeedPage() {
  const { user, loading: authLoading } = useLocalAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    fetchFeed(user.id)
      .then((nextPosts) => {
        if (mounted) setPosts(nextPosts);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar o feed");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [authLoading, user]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {loading ? (
        <div className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Carregando feed...
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum post publicado ainda
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} currentUserId={user?.id ?? null} />)
      )}
    </div>
  );
}
