import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Activity } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type FeedPost, formatDistance, formatDuration, timeAgo } from "@/lib/feed";

export function PostCard({ post, currentUserId }: { post: FeedPost; currentUserId: string }) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [count, setCount] = useState(post.likes_count);

  async function toggleLike() {
    if (liked) {
      setLiked(false); setCount((c) => c - 1);
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
    } else {
      setLiked(true); setCount((c) => c + 1);
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: currentUserId });
    }
  }

  return (
    <article className="bg-card rounded-2xl border shadow-card overflow-hidden">
      <header className="flex items-center gap-3 p-4">
        <Link to="/profile/$username" params={{ username: post.profile?.username ?? "" }}>
          <Avatar className="size-10">
            <AvatarImage src={post.profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground">
              {(post.profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <Link to="/profile/$username" params={{ username: post.profile?.username ?? "" }} className="font-semibold text-sm hover:underline">
            {post.profile?.display_name ?? "Atleta"}
          </Link>
          <p className="text-xs text-muted-foreground">@{post.profile?.username} · {timeAgo(post.created_at)}</p>
        </div>
        {post.type === "workout" && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Treino</Badge>}
        {post.type === "diet" && <Badge variant="secondary" className="bg-success/10 text-success border-success/20">Dieta</Badge>}
      </header>

      {post.content && <p className="px-4 pb-3 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>}

      {post.workout && (
        <div className="mx-4 mb-3 rounded-xl bg-gradient-ember text-primary-foreground p-4">
          <div className="flex items-center gap-2 text-sm opacity-90">
            <Activity className="size-4" /> {post.workout.activity_type} {post.workout.name ? `· ${post.workout.name}` : ""}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div><p className="text-xs opacity-70">Distância</p><p className="font-display text-2xl">{formatDistance(post.workout.distance_meters)}</p></div>
            <div><p className="text-xs opacity-70">Tempo</p><p className="font-display text-2xl">{formatDuration(post.workout.duration_seconds)}</p></div>
            <div><p className="text-xs opacity-70">Calorias</p><p className="font-display text-2xl">{post.workout.calories ? Math.round(post.workout.calories) : "—"}</p></div>
          </div>
        </div>
      )}

      {post.media_urls.length > 0 && (
        <div className={`grid gap-1 ${post.media_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {post.media_urls.map((url, i) => {
            const isVideo = /\.(mp4|webm|mov)$/i.test(url) || url.includes("video");
            return isVideo ? (
              <video key={i} src={url} controls className="w-full max-h-[520px] object-cover bg-black" />
            ) : (
              <img key={i} src={url} alt="" className="w-full max-h-[520px] object-cover" loading="lazy" />
            );
          })}
        </div>
      )}

      <footer className="flex items-center gap-1 p-2 border-t mt-2">
        <Button variant="ghost" size="sm" onClick={toggleLike} className={liked ? "text-primary" : ""}>
          <Heart className={`size-4 mr-2 ${liked ? "fill-current" : ""}`} /> {count}
        </Button>
        <Button variant="ghost" size="sm">
          <MessageCircle className="size-4 mr-2" /> {post.comments_count}
        </Button>
      </footer>
    </article>
  );
}
