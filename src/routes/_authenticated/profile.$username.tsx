import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Activity, Flame, MapPin, Users } from "lucide-react";
import { fetchFeed, type FeedPost, formatDistance } from "@/lib/feed";
import { PostCard } from "@/components/post-card";

export const Route = createFileRoute("/_authenticated/profile/$username")({
  head: ({ params }) => ({ meta: [{ title: `@${params.username} · Lajes Fit` }] }),
  component: ProfilePage,
  notFoundComponent: () => <div className="text-center py-20"><p className="font-display text-4xl">USUÁRIO NÃO ENCONTRADO</p></div>,
});

type Profile = { id: string; username: string; display_name: string; bio: string | null; avatar_url: string | null; city: string | null };

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = Route.useRouteContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, workouts: 0, totalKm: 0, totalKcal: 0 });
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      if (!p) { setProfile(null); return; }
      setProfile(p as Profile);

      const [{ count: followers }, { count: followingC }, { data: workouts }, { data: myFollow }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", p.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", p.id),
        supabase.from("workouts").select("distance_meters, calories").eq("user_id", p.id),
        user
          ? supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", p.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const totalKm = (workouts ?? []).reduce((s, w) => s + (Number(w.distance_meters) || 0), 0);
      const totalKcal = (workouts ?? []).reduce((s, w) => s + (Number(w.calories) || 0), 0);
      setStats({ followers: followers ?? 0, following: followingC ?? 0, workouts: workouts?.length ?? 0, totalKm, totalKcal });
      setFollowing(!!myFollow);

      const all = await fetchFeed(user?.id ?? null);
      setPosts(all.filter((post) => post.user_id === p.id));
    })();
  }, [username, user]);

  if (profile === null) { throw notFound(); }

  async function toggleFollow() {
    if (!profile || !user) return;
    if (following) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id);
      setFollowing(false); setStats((s) => ({ ...s, followers: s.followers - 1 }));
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id });
      setFollowing(true); setStats((s) => ({ ...s, followers: s.followers + 1 }));
    }
  }

  const isMe = user ? profile.id === user.id : false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="bg-card rounded-2xl border shadow-card overflow-hidden">
        <div className="h-32 bg-gradient-hero" />
        <div className="p-6 -mt-16">
          <div className="flex items-end gap-4 flex-wrap">
            <Avatar className="size-28 border-4 border-card">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl font-display">{profile.display_name.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl">{profile.display_name}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              {profile.city && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="size-3" />{profile.city}</p>}
            </div>
            {isMe ? (
              <Button asChild variant="outline"><Link to="/settings">Editar perfil</Link></Button>
            ) : (
              <Button onClick={toggleFollow} variant={following ? "outline" : "default"} disabled={!user}>{following ? "Seguindo" : "Seguir"}</Button>
            )}
          </div>
          {profile.bio && <p className="text-sm mt-4">{profile.bio}</p>}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
            <Stat label="Seguidores" value={stats.followers.toString()} />
            <Stat label="Seguindo" value={stats.following.toString()} />
            <Stat label="Treinos" value={stats.workouts.toString()} icon={Activity} />
            <Stat label="Distância" value={formatDistance(stats.totalKm)} />
            <Stat label="Calorias" value={Math.round(stats.totalKcal).toString()} icon={Flame} />
          </div>
        </div>
      </header>

      <div className="space-y-4">
        <h2 className="font-display text-2xl">PUBLICAÇÕES</h2>
        {posts.length === 0 ? <p className="text-center text-muted-foreground py-12 text-sm">Nenhuma publicação ainda</p>
          : posts.map((p) => <PostCard key={p.id} post={p} currentUserId={user?.id ?? null} />)}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="rounded-xl bg-muted p-3 text-center">
      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">{Icon && <Icon className="size-3" />}{label}</p>
      <p className="font-display text-xl">{value}</p>
    </div>
  );
}
