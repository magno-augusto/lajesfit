import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchFeed, type FeedPost } from "@/lib/feed";
import { PostCard } from "@/components/post-card";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed · Lajes Fit" }] }),
  component: FeedPage,
});

function FeedPage() {
  const { user } = Route.useRouteContext();
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const currentUserId = user?.id ?? null;

  const load = useCallback(async () => {
    const data = await fetchFeed(currentUserId).catch(() => []);
    setPosts(data);
  }, [currentUserId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {currentUserId ? (
        <CreatePostDialog userId={currentUserId} onCreated={load} />
      ) : (
        <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground shadow-card">
          Navegue pelo app livremente. Publicações e curtidas ficam desativadas enquanto o login está pausado.
        </div>
      )}
      {posts === null ? (
        <div className="space-y-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="font-display text-3xl">FEED VAZIO</p>
          <p className="mt-2 text-sm">Seja o primeiro a postar um treino!</p>
        </div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} currentUserId={currentUserId} />)
      )}
    </div>
  );
}
