import { Activity, Heart, MessageCircle, MoreHorizontal, Share2, Trash2 } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type FeedPost } from "./feed-api";
import { formatDistance, formatDuration, timeAgo } from "./format";
import { likePost, unlikePost } from "./likes-api";
import { CommentsDialog } from "./CommentsDialog";

export function PostCard({
  post,
  currentUserId,
  onDelete,
}: {
  post: FeedPost;
  currentUserId: string | null;
  onDelete?: (post: FeedPost) => Promise<void>;
}) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [count, setCount] = useState(post.likes_count);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [sharing, setSharing] = useState(false);
  const navigate = useNavigate();
  const canDelete = currentUserId === post.user_id && Boolean(onDelete);
  const canShare = currentUserId === post.user_id;
  const profileUsername = post.profile?.username ?? "user";
  const hasMedia = post.media_urls.length > 0;
  const contentLines = post.content?.split("\n") ?? [];
  const shouldTruncate = hasMedia && !descriptionExpanded && contentLines.length > 1;
  const visibleContent = shouldTruncate ? contentLines[0] : post.content;

  async function toggleLike() {
    if (!currentUserId) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => (wasLiked ? c - 1 : c + 1));
    try {
      if (wasLiked) await unlikePost(currentUserId, post.id);
      else await likePost(currentUserId, post.id);
    } catch (error) {
      setLiked(wasLiked);
      setCount((c) => (wasLiked ? c + 1 : c - 1));
      toast.error(error instanceof Error ? error.message : "Nao foi possivel curtir a publicacao");
    }
  }

  async function handleShare() {
    const authorName = post.profile?.display_name ?? "Atleta";
    const text = post.content ? `${authorName} no Lajes Fit: ${post.content}` : `${authorName} no Lajes Fit`;
    const url = "https://lajesfit.vercel.app";
    const mediaUrl = post.media_urls[0];

    setSharing(true);
    try {
      let file: File | null = null;
      if (mediaUrl) {
        try {
          const response = await fetch(mediaUrl);
          const blob = await response.blob();
          const extension = blob.type.split("/")[1] ?? "jpg";
          file = new File([blob], `lajesfit-post.${extension}`, { type: blob.type });
        } catch {
          file = null;
        }
      }

      const canShareFiles =
        file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

      if (navigator.share) {
        await navigator.share(
          canShareFiles && file ? { text, url, files: [file] } : { text, url },
        );
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success("Copiado! Cole no app que quiser compartilhar.");
        return;
      }

      toast.error("Compartilhamento nao suportado neste navegador");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error("Nao foi possivel compartilhar a publicacao");
    } finally {
      setSharing(false);
    }
  }

  async function confirmDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(post);
      setConfirmDeleteOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel excluir a publicacao");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="bg-card rounded-2xl border shadow-card overflow-hidden">
      <header className="flex items-center gap-3 p-4">
        <Link
          to="/profile/$username"
          params={{ username: profileUsername }}
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={`Abrir perfil de ${post.profile?.display_name ?? "Atleta"}`}
        >
          <Avatar className="size-10">
            <AvatarImage src={post.profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground">
              {(post.profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div
          className="min-w-0 flex-1 cursor-pointer rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
          role="link"
          tabIndex={0}
          onClick={() =>
            navigate({ to: "/profile/$username", params: { username: profileUsername } })
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              navigate({ to: "/profile/$username", params: { username: profileUsername } });
            }
          }}
        >
          <p className="font-semibold text-sm">{post.profile?.display_name ?? "Atleta"}</p>
          <p className="text-xs text-muted-foreground">
            @{post.profile?.username} · {timeAgo(post.created_at)}
          </p>
        </div>
        {post.type === "workout" && (
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            Treino
          </Badge>
        )}
        {post.type === "diet" && (
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            Dieta
          </Badge>
        )}
        {canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 rounded-full">
                <MoreHorizontal className="size-5" />
                <span className="sr-only">Abrir opcoes do post</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(event) => {
                  event.preventDefault();
                  setConfirmDeleteOpen(true);
                }}
              >
                <Trash2 className="size-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {post.media_urls.length > 0 && (
        <div className={`grid gap-1 ${post.media_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {post.media_urls.map((url, i) => {
            const mediaPath = url.split("?")[0] ?? url;
            const isVideo = /\.(mp4|webm|mov)$/i.test(mediaPath) || url.includes("video");
            return isVideo ? (
              <video
                key={i}
                src={url}
                controls
                className="aspect-square w-full bg-black object-cover"
              />
            ) : (
              <img
                key={i}
                src={url}
                alt=""
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            );
          })}
        </div>
      )}

      {post.content && (
        <div className="px-4 pb-3 pt-3 text-[15px] leading-relaxed">
          <p className="whitespace-pre-wrap">{visibleContent}</p>
          {shouldTruncate && (
            <button
              type="button"
              onClick={() => setDescriptionExpanded(true)}
              className="mt-1 text-sm font-medium text-muted-foreground hover:underline"
            >
              ver mais
            </button>
          )}
        </div>
      )}

      {post.workout && (
        <div className="mx-4 mb-3 rounded-xl bg-gradient-ember text-primary-foreground p-4">
          <div className="flex items-center gap-2 text-sm opacity-90">
            <Activity className="size-4" /> {post.workout.activity_type}{" "}
            {post.workout.name ? `· ${post.workout.name}` : ""}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <p className="text-xs opacity-70">Distância</p>
              <p className="font-display text-2xl">
                {formatDistance(post.workout.distance_meters)}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">Tempo</p>
              <p className="font-display text-2xl">
                {formatDuration(post.workout.duration_seconds)}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">Calorias</p>
              <p className="font-display text-2xl">
                {post.workout.calories ? Math.round(post.workout.calories) : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      <footer className="flex items-center gap-1 p-2 border-t mt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLike}
          disabled={!currentUserId}
          className={liked ? "text-primary" : ""}
        >
          <Heart className={`size-4 mr-2 ${liked ? "fill-current" : ""}`} /> {count}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setCommentsOpen(true)}>
          <MessageCircle className="size-4 mr-2" /> {commentsCount}
        </Button>
        {canShare && (
          <Button variant="ghost" size="sm" onClick={() => void handleShare()} disabled={sharing}>
            <Share2 className="size-4 mr-2" /> Compartilhar
          </Button>
        )}
      </footer>

      <CommentsDialog
        postId={post.id}
        currentUserId={currentUserId}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        onCommentCountChange={(delta) => setCommentsCount((c) => c + delta)}
      />

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir publicacao?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa acao remove o post do feed. Nao sera possivel desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
