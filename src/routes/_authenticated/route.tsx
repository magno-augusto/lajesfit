import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity, Apple, Flame, Home, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logout, useLocalAuth } from "@/lib/local-auth";
import { useLocalFitness } from "@/lib/local-fitness";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AppShell,
});

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useLocalAuth();
  const { idrProfile, summary, loading: fitnessLoading } = useLocalFitness();

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

  const navItems = [
    { to: "/feed", icon: Home, label: "Feed" },
    { to: "/workouts", icon: Activity, label: "Treinos" },
    { to: "/diet", icon: Apple, label: "Dieta" },
  ] as const;

  if (authLoading || fitnessLoading || !session) return <div className="min-h-screen bg-muted/40" />;

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

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="min-w-[148px] rounded-lg bg-gradient-hero px-3 py-2 text-right text-primary-foreground shadow-glow sm:min-w-[190px] sm:px-4">
              <p className="flex items-center justify-end gap-1 text-[11px] font-semibold uppercase text-primary-foreground/85 sm:text-xs">
                <Flame className="size-4" /> Restante do objetivo
              </p>
              <p className="font-display text-3xl leading-none sm:text-4xl">
                {Math.round(summary.remainingCalories)} kcal
              </p>
              <p className="mt-0.5 text-[10px] text-primary-foreground/80 sm:text-xs">
                Meta {Math.round(summary.dailyTarget)} - comida + treino
              </p>
            </div>
            <Avatar className="size-9 border-2 border-primary/30">
              <AvatarImage src={undefined} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                {(idrProfile?.name ?? user?.user_metadata?.username ?? "U").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
              <LogOut className="size-4" />
            </Button>
          </div>
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
