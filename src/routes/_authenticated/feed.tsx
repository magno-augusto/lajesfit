import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { Input } from "@/components/ui/input";
import { PostCard } from "@/components/post-card";
import { deletePost, fetchFeed, type FeedPost } from "@/lib/feed";
import { useLocalAuth } from "@/lib/local-auth";
import { consumePendingNewAction, NEW_ACTION_EVENT } from "@/components/new-action-menu";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed - Lajes Fit" }] }),
  component: FeedPage,
});

function FeedPage() {
  const { user, loading: authLoading } = useLocalAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [profileQuery, setProfileQuery] = useState("");
  const [profileResults, setProfileResults] = useState<
    { id: string; username: string; display_name: string; avatar_url: string | null }[]
  >([]);

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

  useEffect(() => {
    if (!user) return;
    const query = profileQuery.trim().replace(/[%,()]/g, "");
    if (query.length < 2) {
      setProfileResults([]);
      return;
    }

    let mounted = true;
    const timer = window.setTimeout(() => {
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq("id", user.id)
        .limit(6)
        .then(({ data, error }) => {
          if (!mounted) return;
          if (error) {
            toast.error(error.message);
            return;
          }
          setProfileResults(data ?? []);
        });
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [profileQuery, user]);

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
      <div className="rounded-lg border bg-card p-3 shadow-card">
        <Input
          value={profileQuery}
          onChange={(event) => setProfileQuery(event.target.value)}
          placeholder="Buscar pessoas para seguir"
        />
        {profileResults.length > 0 && (
          <ul className="mt-3 divide-y rounded-lg border">
            {profileResults.map((profile) => (
              <li key={profile.id} className="flex items-center gap-3 p-3">
                <Avatar className="size-10">
                  <AvatarImage src={profile.avatar_url ?? undefined} />
                  <AvatarFallback>{profile.display_name.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{profile.display_name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
                </div>
                <Link
                  to="/profile/$username"
                  params={{ username: profile.username }}
                  className="text-sm font-medium text-primary"
                >
                  Ver perfil
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
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
