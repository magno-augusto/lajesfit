import { useEffect, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addComment, deleteComment, fetchComments, type PostComment } from "./comments-api";
import { timeAgo } from "./format";

export function CommentsDialog({
  postId,
  currentUserId,
  open,
  onOpenChange,
  onCommentCountChange,
}: {
  postId: string;
  currentUserId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommentCountChange?: (delta: number) => void;
}) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setLoading(true);
    fetchComments(postId)
      .then((nextComments) => {
        if (mounted) setComments(nextComments);
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Nao foi possivel carregar comentarios",
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [open, postId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) return;

    setSending(true);
    try {
      await addComment(postId, currentUserId, content);
      setContent("");
      setComments(await fetchComments(postId));
      onCommentCountChange?.(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel enviar o comentario");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(comment: PostComment) {
    if (!currentUserId) return;

    try {
      await deleteComment(comment.id, currentUserId);
      setComments((current) => current.filter((item) => item.id !== comment.id));
      onCommentCountChange?.(-1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel excluir o comentario");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Comentarios</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Carregando comentarios...
            </p>
          ) : comments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum comentario ainda. Seja o primeiro a comentar.
            </p>
          ) : (
            <ul className="space-y-3">
              {comments.map((comment) => (
                <li key={comment.id} className="flex items-start gap-3">
                  <Avatar className="size-8">
                    <AvatarImage src={comment.profile.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {comment.profile.display_name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{comment.profile.display_name}</span>{" "}
                      <span className="text-muted-foreground">@{comment.profile.username}</span>
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</p>
                  </div>
                  {currentUserId === comment.userId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => handleDelete(comment)}
                      aria-label="Excluir comentario"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {currentUserId && (
          <form onSubmit={submit} className="flex items-center gap-2 border-t pt-3">
            <Input
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Escreva um comentario..."
              maxLength={500}
            />
            <Button type="submit" size="icon" disabled={sending || !content.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
