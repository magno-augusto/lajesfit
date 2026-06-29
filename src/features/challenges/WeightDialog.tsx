import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WeightDialog({
  triggerLabel,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: (weightKg: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(weight.trim().replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Informe um peso valido em kg");
      return;
    }

    setLoading(true);
    try {
      await onConfirm(parsed);
      setOpen(false);
      setWeight("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel salvar seu peso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="space-y-2">
            <Label htmlFor="challenge-weight">Peso (kg)</Label>
            <Input
              id="challenge-weight"
              type="number"
              min="1"
              step="0.1"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Ex: 72.5"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Seu peso e privado: apenas a posicao no ranking e a porcentagem perdida sao visiveis
            para os outros participantes.
          </p>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : confirmLabel}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
