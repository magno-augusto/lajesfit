import { createFileRoute, Outlet, redirect, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Apple, Home, LogOut, Settings, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

type ProfileMini = { username: string; display_name: string; avatar_url: string | null };

function AppShell() {
  const { user } = Route.useRouteContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileMini | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("username,display_name,avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user.id]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navItems = [
    { to: "/feed", icon: Home, label: "Feed" },
    { to: "/workouts", icon: Activity, label: "Treinos" },
    { to: "/diet", icon: Apple, label: "Dieta" },
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none focus-visible:ring-2 ring-ring">
                <Avatar className="size-9 border-2 border-primary/30">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                    {(profile?.display_name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium">{profile?.display_name ?? "Atleta"}</p>
                <p className="text-xs text-muted-foreground">@{profile?.username ?? "..."}</p>
              </div>
              <DropdownMenuSeparator />
              {profile && (
                <DropdownMenuItem asChild>
                  <Link to="/profile/$username" params={{ username: profile.username }}>
                    <UserIcon className="size-4 mr-2" /> Meu perfil
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="size-4 mr-2" /> Configuracoes
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="size-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-background">
        <div className="grid grid-cols-3">
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
