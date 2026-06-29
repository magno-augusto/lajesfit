import { Activity, Images, Plus, Utensils } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type NewAction = "post" | "meal" | "workout";

export const NEW_ACTION_EVENT = "lajesfit-new-action";
export const NEW_ACTION_KEY = "lajesfit-pending-new-action";

export function consumePendingNewAction(action: NewAction) {
  if (typeof sessionStorage === "undefined") return false;
  const pending = sessionStorage.getItem(NEW_ACTION_KEY);
  if (pending !== action) return false;
  sessionStorage.removeItem(NEW_ACTION_KEY);
  return true;
}

export function NewActionMenu({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();

  function startAction(action: NewAction) {
    sessionStorage.setItem(NEW_ACTION_KEY, action);
    window.dispatchEvent(new CustomEvent(NEW_ACTION_EVENT, { detail: action }));

    if (action === "post") navigate({ to: "/feed" });
    if (action === "meal") navigate({ to: "/diario" });
    if (action === "workout") navigate({ to: "/diario" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size={compact ? "icon" : "lg"}
          className={
            compact
              ? "size-14 rounded-full border-4 border-background shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
              : "rounded-full px-5 shadow-sm"
          }
          aria-label="Criar novo registro"
        >
          <Plus className={compact ? "size-7" : "mr-2 size-5"} />
          {!compact && "Novo"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-52">
        <DropdownMenuItem onSelect={() => startAction("post")}>
          <Images className="size-4" />
          Post no feed
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => startAction("meal")}>
          <Utensils className="size-4" />
          Refeicao
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => startAction("workout")}>
          <Activity className="size-4" />
          Treino
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
