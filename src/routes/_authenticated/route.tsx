import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Activity, Apple, Home, LogIn, Trophy, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InstallAppButton } from "@/components/install-app-button";
import { NewActionMenu } from "@/components/new-action-menu";
import { LEGACY_EMAIL_DOMAIN, useLocalAuth } from "@/features/auth/auth";
import { useFitness } from "@/features/fitness/useFitness";
import { useStravaConnection } from "@/features/workouts/useStravaConnection";
import { NotificationsSheet } from "@/features/notifications/NotificationsSheet";
import { getUnreadNotificationCount } from "@/features/notifications/notifications-api";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AppShell,
});

function AppHeader({ userId }: { userId: string }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getUnreadNotificationCount(userId)
      .then(setUnreadCount)
      .catch(() => {
        // contador e' informativo: falha nao deve quebrar o cabecalho
      });
  }, [userId]);

  const handleOpened = useCallback(() => setUnreadCount(0), []);

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-3">
        <Link to="/feed" className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <img src={logoUrl} alt="LajesFit" className="size-8 shrink-0 rounded-md sm:size-9" />
          <span className="whitespace-nowrap font-display text-xl leading-none text-secondary sm:text-2xl">
            lajesfit
          </span>
        </Link>

        <div className="flex shrink-0 items-center justify-end gap-1">
          <InstallAppButton header />
          <NewActionMenu />
          <NotificationsSheet userId={userId} unreadCount={unreadCount} onOpened={handleOpened} />
        </div>
      </div>
    </header>
  );
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useLocalAuth();
  const { idrProfile, loading: fitnessLoading } = useFitness();
  const {
    connected: stravaConnected,
    busy: stravaBusy,
    connect: connectStrava,
  } = useStravaConnection();
  const [profile, setProfile] = useState<{
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_admin: boolean;
  } | null>(null);

  useEffect(() => {
    if (authLoading || fitnessLoading) return;
    if (!session) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    const needsRealEmail = user?.email?.endsWith(LEGACY_EMAIL_DOMAIN) && !user?.new_email;
    if (needsRealEmail) {
      navigate({ to: "/require-email", replace: true });
      return;
    }
    if (!idrProfile) navigate({ to: "/setup", replace: true });
  }, [authLoading, fitnessLoading, idrProfile, navigate, session, user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    let mounted = true;
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted && data) setProfile(data);
      });

    function handleProfileUpdated(event: Event) {
      const nextProfile = (event as CustomEvent<typeof profile>).detail;
      if (nextProfile) setProfile(nextProfile);
    }

    window.addEventListener("lajesfit-profile-updated", handleProfileUpdated);

    return () => {
      mounted = false;
      window.removeEventListener("lajesfit-profile-updated", handleProfileUpdated);
    };
  }, [user]);

  const navItems = [
    { to: "/feed", icon: Home, label: "Feed" },
    { to: "/dieta", icon: Apple, label: "Dieta" },
    { to: "/treinos", icon: Activity, label: "Treinos" },
  ] as const;

  const needsRealEmail = user?.email?.endsWith(LEGACY_EMAIL_DOMAIN) && !user?.new_email;

  // Botao "Conectar Strava" abaixo do nome do app, apenas nestas telas e enquanto desconectado
  const stravaConnectRoutes = ["/feed", "/dieta", "/treinos", "/desafio"];
  const showStravaConnect =
    stravaConnected === false &&
    stravaConnectRoutes.some((route) => location.pathname.startsWith(route));

  if (authLoading || fitnessLoading || !session || needsRealEmail || !idrProfile) {
    return <div className="min-h-screen bg-muted/40" />;
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {user && <AppHeader userId={user.id} />}

      <main className="mx-auto max-w-3xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-17">
        {showStravaConnect && (
          <div className="mb-2 flex justify-center">
            <Button
              type="button"
              size="sm"
              className="h-8 w-full rounded-full bg-[#FC4C02] text-white hover:bg-[#e34402]"
              onClick={connectStrava}
              disabled={stravaBusy}
            >
              <Zap className="mr-1.5 size-3.5" />
              {stravaBusy ? "Abrindo..." : "Conectar Strava"}
            </Button>
          </div>
        )}
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 border-t bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-3xl grid-cols-5 items-end">
          {[navItems[0], navItems[1]].map((item) => {
            const active =
              location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={(event) => {
                  if (item.to === "/feed" && location.pathname.startsWith("/feed")) {
                    event.preventDefault();
                    window.location.reload();
                  }
                }}
                className={`flex flex-col items-center gap-1 py-3 text-xs ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span className="flex size-8 items-center justify-center">
                  <item.icon className="size-5" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            to="/treinos"
            className={`flex flex-col items-center gap-1 py-3 text-xs ${
              location.pathname.startsWith("/treinos") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span className="flex size-8 items-center justify-center">
              <Activity className="size-5" />
            </span>
            <span>Treinos</span>
          </Link>
          <Link
            to="/desafio"
            className={`flex flex-col items-center gap-1 py-3 text-xs ${
              location.pathname.startsWith("/desafio") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span className="flex size-8 items-center justify-center">
              <Trophy className="size-5" />
            </span>
            <span>Desafio</span>
          </Link>
          {user ? (
            <Link
              to="/profile/$username"
              params={{ username: profile?.username ?? user.user_metadata?.username ?? "user" }}
              className={`flex flex-col items-center gap-1 py-3 text-xs ${
                location.pathname.startsWith("/profile") ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="flex size-8 items-center justify-center">
                <Avatar className="size-7 border border-primary/30">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-primary text-[11px] font-semibold text-primary-foreground">
                    {(profile?.display_name ?? user.user_metadata?.username ?? "U")
                      .slice(0, 1)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </span>
              <span>Perfil</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground"
            >
              <span className="flex size-8 items-center justify-center">
                <LogIn className="size-5" />
              </span>
              <span>Login</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
