import { createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalAuth } from "@/lib/local-auth";

type Profile = { id: string; username: string; display_name: string; avatar_url: string | null; bio: string | null };

export const Route = createFileRoute("/_authenticated/profile/$username")({
  head: ({ params }) => ({ meta: [{ title: `@${params.username} - Lajes Fit` }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = useLocalAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ followers: 0, following: 0, workouts: 0, posts: 0 });
  const [isFollowing, setIsFollowing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: p } = await supabase.from("profiles").select("id, username, display_name, avatar_url, bio").eq("username", username).maybeSingle();
    if (!p) { setProfile(null); setLoading(false); throw notFound(); }
    setProfile(p);
    const [{ count: followers }, { count: following }, { count: workouts }, { count: posts }, { data: rel }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", p.id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", p.id),
      supabase.from("workouts").select("*", { count: "exact", head: true }).eq("user_id", p.id),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", p.id),
      supabase.from("follows").select("follower_id").eq("following_id", p.id).eq("follower_id", user.id).maybeSingle(),
    ]);
    setCounts({ followers: followers ?? 0, following: following ?? 0, workouts: workouts ?? 0, posts: posts ?? 0 });
    setIsFollowing(!!rel);
    setLoading(false);
  }, [username, user]);

  useEffect(() => { load(); }, [load]);

  async function toggleFollow() {
    if (!profile || !user) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id);
      setIsFollowing(false); setCounts((c) => ({ ...c, followers: c.followers - 1 }));
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id });
      setIsFollowing(true); setCounts((c) => ({ ...c, followers: c.followers + 1 }));
    }
  }

  if (!user || loading) return <Skeleton className="h-64 rounded-2xl max-w-2xl mx-auto" />;
  if (!profile) return <p className="text-center py-20">Perfil não encontrado</p>;

  const isMe = profile.id === user.id;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-20 border-4 border-primary/30">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="text-2xl">{profile.display_name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="font-display text-3xl">{profile.display_name}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
          {!isMe && (
            <Button onClick={toggleFollow} variant={isFollowing ? "outline" : "default"}>{isFollowing ? "Seguindo" : "Seguir"}</Button>
          )}
        </div>
        {profile.bio && <p className="mt-4 text-sm">{profile.bio}</p>}
        <div className="grid grid-cols-4 gap-2 mt-6 text-center">
          <div><p className="font-display text-2xl">{counts.posts}</p><p className="text-xs text-muted-foreground">Posts</p></div>
          <div><p className="font-display text-2xl">{counts.workouts}</p><p className="text-xs text-muted-foreground">Treinos</p></div>
          <div><p className="font-display text-2xl">{counts.followers}</p><p className="text-xs text-muted-foreground">Seguidores</p></div>
          <div><p className="font-display text-2xl">{counts.following}</p><p className="text-xs text-muted-foreground">Seguindo</p></div>
        </div>
      </Card>
    </div>
  );
}
