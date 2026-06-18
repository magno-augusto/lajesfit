import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FeedPost } from "@/lib/feed";
import { toast } from "sonner";

type Comment = { id: string; content: string; created_at: string; user_id: string; author: { username: string; display_name: string; avatar_url: string | null } | null };

export function PostCard({ post, currentUserId }: { post: FeedPost; currentUserId: string }) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likes, setLikes] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [newComment, setNewComment] = useState("");
  const [count, setCount] = useState(post.comments_count);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    if (next) {
      const { error } = await supabase.from("post_likes").insert({ post_id: post.id, user_id: currentUserId });
      if (error) { setLiked(false); setLikes((n) => n - 1); toast.error("Não foi possível curtir"); }
    } else {
      const { error } = await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
      if (error) { setLiked(true); setLikes((n) => n + 1); toast.error("Não foi possível descurtir"); }
    }
  }

  async function loadComments() {
    setShowComments(true);
    if (comments !== null) return;
    const { data: raw } = await supabase
      .from("post_comments")
      .select("id, content, created_at, user_id")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    if (!raw) { setComments([]); return; }
    const userIds = Array.from(new Set(raw.map((c) => c.user_id)));
    const { data: authors } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds);
    const map = new Map((authors ?? []).map((a) => [a.id, { username: a.username, display_name: a.display_name, avatar_url: a.avatar_url }]));
    setComments(raw.map((c) => ({ ...c, author: map.get(c.user_id) ?? null })));
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    const content = newComment.trim();
    if (!content) return;
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: post.id, user_id: currentUserId, content })
      .select("id, content, created_at, user_id")
      .single();
    if (error || !data) { toast.error("Erro ao comentar"); return; }
    const { data: me } = await supabase.from("profiles").select("username, display_name, avatar_url").eq("id", currentUserId).maybeSingle();
    setComments((c) => [...(c ?? []), { ...data, author: me ? { username: me.username, display_name: me.display_name, avatar_url: me.avatar_url } : null }]);
    setNewComment("");
    setCount((n) => n + 1);
  }

  return (
    <article className="bg-card border rounded-2xl overflow-hidden shadow-sm">
      <header className="flex items-center gap-3 p-4">
        <Link to="/profile/$username" params={{ username: post.author.username }}>
          <Avatar className="size-10 border-2 border-primary/30">
            <AvatarImage src={post.author.avatar_url ?? undefined} />
            <AvatarFallback>{post.author.display_name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <Link to="/profile/$username" params={{ username: post.author.username }} className="font-semibold hover:underline">
            {post.author.display_name}
          </Link>
          <p className="text-xs text-muted-foreground">
            @{post.author.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      </header>

      <p className="px-4 pb-3 whitespace-pre-wrap">{post.content}</p>

      {post.media_url && (
        <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover" />
      )}

      <div className="flex items-center gap-1 px-2 py-2 border-t">
        <Button variant="ghost" size="sm" onClick={toggleLike} className={liked ? "text-red-500" : ""}>
          <Heart className={`size-4 mr-1 ${liked ? "fill-current" : ""}`} /> {likes}
        </Button>
        <Button variant="ghost" size="sm" onClick={loadComments}>
          <MessageCircle className="size-4 mr-1" /> {count}
        </Button>
      </div>

      {showComments && (
        <div className="border-t bg-muted/30 px-4 py-3 space-y-3">
          {(comments ?? []).map((c) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <Avatar className="size-7"><AvatarImage src={c.author?.avatar_url ?? undefined} /><AvatarFallback>{(c.author?.display_name ?? "?").slice(0,1)}</AvatarFallback></Avatar>
              <div className="flex-1">
                <span className="font-semibold mr-2">{c.author?.display_name ?? "Usuário"}</span>
                {c.content}
              </div>
            </div>
          ))}
          <form onSubmit={addComment} className="flex gap-2">
            <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Comentar..." />
            <Button type="submit" size="sm">Enviar</Button>
          </form>
        </div>
      )}
    </article>
  );
}
