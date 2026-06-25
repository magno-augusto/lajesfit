import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Apple, Flame, Home, Info, LogIn, LogOut, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InstallAppButton } from "@/components/install-app-button";
import { NewActionMenu } from "@/components/new-action-menu";
import { logout, useLocalAuth } from "@/features/auth/auth";
import { useFitness } from "@/features/fitness/useFitness";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AppShell,
});

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useLocalAuth();
  const { idrProfile, summary, loading: fitnessLoading } = useFitness();
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
    if (!idrProfile) navigate({ to: "/setup", replace: true });
  }, [authLoading, fitnessLoading, idrProfile, navigate, session]);

  async function handleLogout() {
    await logout();
    navigate({ to: "/auth", replace: true });
  }

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
    { to: "/diet", icon: Apple, label: "Dieta" },
    { to: "/workouts", icon: Activity, label: "Treinos" },
  ] as const;

  if (authLoading || fitnessLoading || !session || !idrProfile) {
    return <div className="min-h-screen bg-muted/40" />;
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="container mx-auto grid min-h-16 grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2">
          <div className="flex min-w-0 items-center">
            <Link to="/feed" className="flex items-center gap-2">
              <img src={logo} alt="Lajes Fit" className="h-9 w-9 rounded-lg object-cover" />
              <span className="font-display text-2xl hidden sm:block">LAJES FIT</span>
            </Link>
          </div>

          <nav className="hidden justify-center md:flex">
            <div className="flex items-center gap-1 rounded-full border bg-muted/40 p-1">
              {navItems.map((item) => {
                const active = location.pathname.startsWith(item.to);
                return (
                  <Button
                    key={item.to}
                    asChild
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-full"
                  >
                    <Link to={item.to}>
                      <item.icon className="size-4 mr-2" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </nav>

          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <div className="hidden md:block">
              <NewActionMenu />
            </div>
            <div className="fixed left-1/2 top-0 z-40 min-w-[178px] -translate-x-1/2 rounded-b-lg rounded-t-none bg-gradient-hero px-4 py-3 text-center text-primary-foreground shadow-glow sm:min-w-[230px] sm:px-5 md:static md:z-auto md:min-w-[190px] md:translate-x-0 md:rounded-lg md:px-4 md:py-2 md:shadow-card lg:min-w-[220px]">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="absolute right-1.5 top-1.5 inline-flex size-5 items-center justify-center rounded-full text-primary-foreground/85 transition hover:bg-primary-foreground/15 hover:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary-foreground/70"
                    aria-label="Ver detalhes do limite calorico"
                  >
                    <Info className="size-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 text-sm">
                  <div className="space-y-2">
                    <p className="text-center font-medium">Limite de calorias</p>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-muted-foreground">Objetivo</span>
                      <span className="font-medium">{Math.round(summary.dailyTarget)} kcal</span>
                    </div>
                    <div className="flex justify-center text-sm font-semibold text-muted-foreground">
                      +
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-muted-foreground">Exercicios</span>
                      <span className="font-medium">
                        {Math.round(summary.workoutCalories)} kcal
                      </span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <p className="flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground/85 sm:text-xs md:text-[10px] lg:text-xs">
                <Flame className="size-3.5" />
                Calorias
              </p>
              <p className="flex items-baseline justify-center gap-1.5 whitespace-nowrap font-display leading-none">
                <span className="text-3xl sm:text-4xl md:text-3xl lg:text-4xl">
                  {Math.round(summary.mealCalories)}
                </span>
                <span className="text-xl text-primary-foreground/75 sm:text-2xl">/</span>
                <span className="text-lg text-primary-foreground/85 sm:text-xl">
                  {Math.round(summary.limitCalories)}
                </span>
                <span className="text-xs font-sans text-primary-foreground/75">kcal</span>
              </p>
            </div>
            {user && (
              <Button
                asChild
                variant={location.pathname.startsWith("/profile") ? "secondary" : "ghost"}
                size="sm"
                className="hidden rounded-full pl-2 pr-3 md:inline-flex"
              >
                <Link
                  to="/profile/$username"
                  params={{ username: profile?.username ?? user.user_metadata?.username ?? "user" }}
                >
                  <Avatar className="mr-2 size-7 border border-primary/30">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-primary text-[11px] font-semibold text-primary-foreground">
                      {(profile?.display_name ?? user.user_metadata?.username ?? "U")
                        .slice(0, 1)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  Perfil
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu">
                  <Menu className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <InstallAppButton menuItem />
                <DropdownMenuItem onSelect={() => void handleLogout()}>
                  <LogOut className="mr-2 size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-background">
        <div className="grid grid-cols-5 items-end">
          {[navItems[0], navItems[1]].map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
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
          <div className="-mt-7 flex flex-col items-center gap-1 pb-2 text-xs text-primary">
            <NewActionMenu compact />
            <span className="font-semibold">Novo</span>
          </div>
          <Link
            to="/workouts"
            className={`flex flex-col items-center gap-1 py-3 text-xs ${
              location.pathname.startsWith("/workouts") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span className="flex size-8 items-center justify-center">
              <Activity className="size-5" />
            </span>
            <span>Treinos</span>
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
