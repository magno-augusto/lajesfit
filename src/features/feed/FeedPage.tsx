import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreatePostDialog } from "./CreatePostDialog";
import { PostCard } from "./PostCard";
import { deletePost, fetchFeed, type FeedPost } from "./feed-api";
import { useLocalAuth } from "@/features/auth/auth";
import { consumePendingNewAction, NEW_ACTION_EVENT } from "@/components/new-action-menu";

export function FeedPage() {
  const { user, loading: authLoading } = useLocalAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [createPostOpen, setCreatePostOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPosts([]);
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
          if (mounted) setPosts(nextPosts);
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

  async function refreshFeed() {
    if (!user) return;
    setPosts(await fetchFeed(user.id));
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
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={user?.id ?? null}
            onDelete={handleDeletePost}
          />
        ))
      )}
    </div>
  );
}
