import { useEffect, useState } from "react";
import { Bell, Heart, MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { timeAgo } from "@/features/feed/format";
import {
  fetchNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from "./notifications-api";

function notificationText(notification: AppNotification) {
  return notification.type === "like"
    ? `${notification.actor.displayName} curtiu sua publicacao`
    : `${notification.actor.displayName} comentou na sua publicacao`;
}

export function NotificationsSheet({
  userId,
  unreadCount,
  onOpened,
}: {
  userId: string;
  unreadCount: number;
  onOpened: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchNotifications(userId)
      .then(setNotifications)
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Nao foi possivel carregar notificacoes",
        );
      })
      .finally(() => setLoading(false));

    markAllNotificationsRead(userId)
      .then(onOpened)
      .catch(() => {
        // melhor esforco: nao bloqueia a visualizacao se falhar
      });
  }, [open, userId, onOpened]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificacoes">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Notificacoes</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificacao ainda
            </p>
          ) : (
            notifications.map((notification) => (
              <Link
                key={notification.id}
                to="/profile/$username"
                params={{ username: notification.actor.username }}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/60"
              >
                <Avatar className="size-9">
                  <AvatarImage src={notification.actor.avatarUrl ?? undefined} />
                  <AvatarFallback>
                    {notification.actor.displayName.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{notificationText(notification)}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</p>
                </div>
                {notification.type === "like" ? (
                  <Heart className="size-4 text-primary" />
                ) : (
                  <MessageCircle className="size-4 text-primary" />
                )}
              </Link>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
