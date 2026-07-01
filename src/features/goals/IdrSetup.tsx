import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Calculator, Flame } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVITY_FACTORS, calculateIdr, saveIdrProfile, type IdrProfile } from "./goals-api";

type SetupState = Omit<IdrProfile, "idrCalories" | "createdAt">;

export function IdrSetup() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<SetupState>({
    name: "",
    sex: "female",
    age: 30,
    weightKg: 70,
    heightCm: 170,
    activityLevel: "moderate",
  });

  const preview = useMemo(() => calculateIdr(state), [state]);

  function update<K extends keyof SetupState>(key: K, value: SetupState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!state.name.trim()) {
      toast.error("Informe seu nome para continuar");
      return;
    }

    setSaving(true);
    try {
      await saveIdrProfile({ ...state, name: state.name.trim() });
      toast.success("Objetivo calorico calculado");
      navigate({ to: "/feed", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar seu objetivo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center px-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl">LAJES FIT</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-lg border bg-card p-6 shadow-card">
            <div className="mb-6">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">
                Primeiro acesso
              </p>
              <h1 className="mt-2 font-display text-4xl leading-none">
                CALCULE SEU OBJETIVO CALORICO
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Responda os dados abaixo para definir sua meta diaria de calorias.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="setup-name">Nome</Label>
                  <Input
                    id="setup-name"
                    value={state.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="Como quer aparecer"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sexo biologico</Label>
                  <Select
                    value={state.sex}
                    onValueChange={(value) => update("sex", value as SetupState["sex"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Feminino</SelectItem>
                      <SelectItem value="male">Masculino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <NumberField
                  label="Idade"
                  value={state.age}
                  min={12}
                  max={100}
                  onChange={(value) => update("age", value)}
                />
                <NumberField
                  label="Peso (kg)"
                  value={state.weightKg}
                  min={30}
                  max={250}
                  step="0.1"
                  onChange={(value) => update("weightKg", value)}
                />
                <NumberField
                  label="Altura (cm)"
                  value={state.heightCm}
                  min={120}
                  max={230}
                  onChange={(value) => update("heightCm", value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Nivel de atividade no dia a dia (sem contar treino)</Label>
                <Select
                  value={state.activityLevel}
                  onValueChange={(value) =>
                    update("activityLevel", value as SetupState["activityLevel"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_FACTORS).map(([key, activity]) => (
                      <SelectItem key={key} value={key}>
                        {activity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
                <Calculator className="mr-2 size-4" />
                {saving ? "Salvando..." : "Salvar objetivo e abrir app"}
              </Button>
            </form>
          </section>

          <aside className="rounded-lg bg-gradient-hero p-6 text-primary-foreground shadow-glow">
            <p className="text-xs uppercase tracking-widest opacity-80">Previa da meta</p>
            <div className="mt-4 flex items-end gap-2">
              <Flame className="mb-2 size-9" />
              <p className="font-display text-6xl leading-none">{preview}</p>
              <p className="mb-2 text-sm">kcal</p>
            </div>
            <p className="mt-4 text-sm text-primary-foreground/80">
              Esse sera seu objetivo calorico diario. Refeicoes subtraem calorias; exercicios
              adicionam calorias disponiveis ao dia.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = "1",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: string;
  onChange: (value: number) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  function handleChange(nextValue: string) {
    setInputValue(nextValue);

    const trimmed = nextValue.trim();
    if (!trimmed) return;

    const parsed = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) return;

    onChange(parsed);
  }

  function handleBlur() {
    const trimmed = inputValue.trim();
    const parsed = Number(trimmed.replace(",", "."));

    if (!trimmed || !Number.isFinite(parsed)) {
      setInputValue(String(value));
      return;
    }

    const clamped = Math.min(max, Math.max(min, parsed));
    setInputValue(String(clamped));
    onChange(clamped);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={inputValue}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
        required
      />
    </div>
  );
}
