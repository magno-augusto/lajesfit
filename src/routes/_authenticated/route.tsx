import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Apple, Home, LogIn, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LEGACY_EMAIL_DOMAIN, useLocalAuth } from "@/features/auth/auth";
import { useFitness } from "@/features/fitness/useFitness";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AppShell,
});

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useLocalAuth();
  const { idrProfile, loading: fitnessLoading } = useFitness();
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
    const needsRealEmail =
      user?.email?.endsWith(LEGACY_EMAIL_DOMAIN) && !user?.new_email;
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

  if (authLoading || fitnessLoading || !session || needsRealEmail || !idrProfile) {
    return <div className="min-h-screen bg-muted/40" />;
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <main className="container mx-auto px-4 pt-3 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 border-t bg-background">
        <div className="grid grid-cols-5 items-end">
          {[navItems[0], navItems[1]].map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
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
