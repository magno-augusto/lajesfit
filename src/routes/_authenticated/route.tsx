import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Home, Activity, Apple, Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    return { user: data.user ?? null };
  },
  component: AppShell,
});

type ProfileMini = { username: string; display_name: string; avatar_url: string | null };

function AppShell() {
  const { user } = Route.useRouteContext();
  const location = useLocation();
  const [profile, setProfile] = useState<ProfileMini | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    supabase
      .from("profiles")
      .select("username,display_name,avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const navItems = [
    { to: "/feed", icon: Home, label: "Feed" },
    { to: "/workouts", icon: Activity, label: "Treinos" },
    { to: "/diet", icon: Apple, label: "Dieta" },
    { to: "/events", icon: Calendar, label: "Eventos" },
  ] as const;

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/feed" className="flex items-center gap-2">
            <img src={logo} alt="Lajes Fit" className="h-9 w-9 rounded-lg object-cover" />
            <span className="font-display text-2xl hidden sm:block">LAJES FIT</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <Button key={item.to} asChild variant={active ? "secondary" : "ghost"} size="sm">
                  <Link to={item.to}>
                    <item.icon className="size-4 mr-2" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/settings">
                <Settings className="size-4 mr-2" />
                <span className="hidden sm:inline">Configurações</span>
              </Link>
            </Button>
            <Avatar className="size-9 border-2 border-primary/30">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                {(profile?.display_name ?? user?.email ?? "L").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-background">
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-3 text-xs ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
