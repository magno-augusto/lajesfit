import {
  Activity,
  Heart,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRef, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type FeedPost } from "./feed-api";
import { formatDistance, formatDuration, timeAgo } from "./format";
import { buildShareImage, getPostShareStats } from "./share-image";
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
  const [shareOpen, setShareOpen] = useState(false);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const sharePreparedRef = useRef(false);
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

  const shareText = (() => {
    const authorName = post.profile?.display_name ?? "Atleta";
    return post.content
      ? `${authorName} no Lajes Fit: ${post.content}`
      : `${authorName} no Lajes Fit`;
  })();
  const shareUrl = "https://lajesfit.vercel.app";

  async function prepareShareFile(): Promise<File | null> {
    if (sharePreparedRef.current) return shareFile;
    sharePreparedRef.current = true;
    const mediaUrl = post.media_urls[0];
    if (!mediaUrl) return null;
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      // sobrepoe marca e estatisticas (treino/refeicao) na foto; se nao der
      // (ex: video), compartilha a midia original
      const composed = await buildShareImage(blob, getPostShareStats(post));
      const finalBlob = composed ?? blob;
      const extension = finalBlob.type.split("/")[1] ?? "jpg";
      const file = new File([finalBlob], `lajesfit-post.${extension}`, { type: finalBlob.type });
      setShareFile(file);
      return file;
    } catch {
      return null;
    }
  }

  // Abre direto a folha de compartilhamento nativa do sistema (Android/iOS);
  // o dialog customizado fica como fallback para navegadores sem Web Share API.
  async function handleShare() {
    if (typeof navigator.share !== "function") {
      void prepareShareFile();
      setShareOpen(true);
      return;
    }

    const file = await prepareShareFile();
    const canShareFiles =
      file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
    try {
      await navigator.share(
        canShareFiles && file
          ? { text: shareText, url: shareUrl, files: [file] }
          : { text: shareText, url: shareUrl },
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setShareOpen(true);
    }
  }

  // window.open pode ser bloqueado (popup blocker, principalmente no mobile);
  // nesse caso navega na propria aba, que nunca e' bloqueado.
  function openExternal(url: string) {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = url;
  }

  async function copyShareText(): Promise<boolean> {
    if (!navigator.clipboard) return false;
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      return true;
    } catch {
      return false;
    }
  }

  async function shareViaWhatsApp() {
    const encoded = encodeURIComponent(`${shareText}\n${shareUrl}`);
    openExternal(`https://wa.me/?text=${encoded}`);
    setShareOpen(false);
  }

  async function shareViaInstagram() {
    const copied = await copyShareText();
    toast.success(
      copied
        ? "Texto copiado! Cole nos Stories ou Direct."
        : "Abra os Stories ou Direct para compartilhar.",
    );
    openExternal("https://www.instagram.com/");
    setShareOpen(false);
  }

  async function shareNative() {
    const canShareFiles =
      shareFile &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [shareFile] });
    try {
      if (navigator.share) {
        await navigator.share(
          canShareFiles && shareFile
            ? { text: shareText, url: shareUrl, files: [shareFile] }
            : { text: shareText, url: shareUrl },
        );
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast.success("Copiado! Cole no app que quiser compartilhar.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error("Nao foi possivel compartilhar");
    }
    setShareOpen(false);
  }

  async function copyLink() {
    const copied = await copyShareText();
    if (copied) toast.success("Link copiado!");
    else toast.error("Nao foi possivel copiar neste navegador");
    setShareOpen(false);
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleShare()}
            className="ml-auto"
            aria-label="Compartilhar publicacao"
          >
            <Share2 className="size-4" />
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

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Compartilhar</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => void shareViaWhatsApp()}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 hover:bg-muted transition-colors"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-[#25D366]">
                <svg viewBox="0 0 24 24" className="size-6 fill-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <span className="text-sm font-medium">WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => void shareViaInstagram()}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 hover:bg-muted transition-colors"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
                <svg viewBox="0 0 24 24" className="size-6 fill-white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </div>
              <span className="text-sm font-medium">Instagram</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="flex items-center justify-center gap-2 rounded-xl border p-3 hover:bg-muted transition-colors text-sm"
            >
              <Link2 className="size-4" /> Copiar link
            </button>
            <button
              type="button"
              onClick={() => void shareNative()}
              className="flex items-center justify-center gap-2 rounded-xl border p-3 hover:bg-muted transition-colors text-sm"
            >
              <Share2 className="size-4" /> Mais opções
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}
