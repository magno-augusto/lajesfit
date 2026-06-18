import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity, Apple, Flame, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LOCAL_USER, useLocalFitness } from "@/lib/local-fitness";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => ({ user: LOCAL_USER }),
  component: AppShell,
});

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { idrProfile, summary } = useLocalFitness();

  useEffect(() => {
    if (!idrProfile) navigate({ to: "/setup", replace: true });
  }, [idrProfile, navigate]);

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

          <div className="flex items-center gap-3">
            <div className="rounded-lg border bg-card px-3 py-1.5 text-right shadow-sm">
              <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                <Flame className="size-3.5 text-primary" /> Restante do IDR
              </p>
              <p className="font-display text-2xl leading-none">
                {Math.round(summary.remainingCalories)} kcal
              </p>
              <p className="text-[10px] text-muted-foreground">
                IDR {Math.round(summary.dailyTarget)} - comida + treino
              </p>
            </div>
            <Avatar className="size-9 border-2 border-primary/30">
              <AvatarImage src={undefined} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                {(idrProfile?.name ?? LOCAL_USER.displayName).slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
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
