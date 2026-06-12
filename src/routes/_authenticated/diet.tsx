import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Trash2, Flame } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/diet")({
  head: () => ({ meta: [{ title: "Dieta · Lajes Fit" }] }),
  component: DietPage,
});

type Food = { id: number; name: string; category: string | null; energy_kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; sodium_mg: number };
type Entry = { id: string; food_id: number; grams: number; meal: "breakfast" | "lunch" | "snack" | "dinner"; consumed_at: string; food: Food };

const MEALS = [
  { key: "breakfast", label: "Café da manhã" },
  { key: "lunch", label: "Almoço" },
  { key: "snack", label: "Lanche" },
  { key: "dinner", label: "Jantar" },
] as const;

function macros(food: Food, grams: number) {
  const f = grams / 100;
  return {
    kcal: food.energy_kcal * f,
    p: food.protein_g * f,
    c: food.carbs_g * f,
    g: food.fat_g * f,
  };
}

function DietPage() {
  const { user } = Route.useRouteContext();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  async function load() {
    const start = new Date(date + "T00:00:00").toISOString();
    const end = new Date(date + "T23:59:59").toISOString();
    const { data } = await supabase
      .from("diet_entries")
      .select("id, food_id, grams, meal, consumed_at, food:taco_foods(*)")
      .eq("user_id", user.id)
      .gte("consumed_at", start)
      .lte("consumed_at", end)
      .order("consumed_at");
    setEntries((data ?? []) as any);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  async function remove(id: string) {
    await supabase.from("diet_entries").delete().eq("id", id);
    load();
  }

  const totals = useMemo(() => {
    return entries.reduce((acc, e) => {
      const m = macros(e.food, e.grams);
      return { kcal: acc.kcal + m.kcal, p: acc.p + m.p, c: acc.c + m.c, g: acc.g + m.g };
    }, { kcal: 0, p: 0, c: 0, g: 0 });
  }, [entries]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-6 shadow-glow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-primary-foreground/80 text-xs uppercase tracking-widest">Resumo do dia</p>
            <p className="font-display text-5xl mt-1 flex items-center gap-2">
              <Flame className="size-8" /> {Math.round(totals.kcal)} <span className="text-lg font-sans">kcal</span>
            </p>
          </div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="bg-primary-foreground/15 border border-primary-foreground/30 rounded-lg px-3 py-2 text-sm text-primary-foreground" />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Macro label="Proteína" value={totals.p} unit="g" />
          <Macro label="Carboidrato" value={totals.c} unit="g" />
          <Macro label="Gordura" value={totals.g} unit="g" />
        </div>
      </div>

      {MEALS.map((m) => {
        const items = entries.filter((e) => e.meal === m.key);
        const kcal = items.reduce((s, e) => s + macros(e.food, e.grams).kcal, 0);
        return (
          <section key={m.key} className="bg-card rounded-2xl border shadow-card overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-display text-2xl">{m.label.toUpperCase()}</h3>
                <p className="text-xs text-muted-foreground">{Math.round(kcal)} kcal · {items.length} item(ns)</p>
              </div>
              <AddFoodDialog userId={user.id} meal={m.key} date={date} onAdded={load} />
            </header>
            <ul className="divide-y">
              {items.length === 0 ? (
                <li className="px-4 py-6 text-sm text-muted-foreground text-center">Nenhum alimento registrado</li>
              ) : items.map((e) => {
                const M = macros(e.food, e.grams);
                return (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.food.name}</p>
                      <p className="text-xs text-muted-foreground">{e.grams}g · {M.p.toFixed(1)}P / {M.c.toFixed(1)}C / {M.g.toFixed(1)}G</p>
                    </div>
                    <p className="font-display text-xl">{Math.round(M.kcal)}</p>
                    <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="size-4" /></Button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Macro({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="bg-primary-foreground/10 rounded-xl p-3">
      <p className="text-xs text-primary-foreground/70">{label}</p>
      <p className="font-display text-2xl">{value.toFixed(1)}<span className="text-sm font-sans ml-1">{unit}</span></p>
    </div>
  );
}

function AddFoodDialog({ userId, meal, date, onAdded }: { userId: string; meal: Entry["meal"]; date: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const query = supabase.from("taco_foods").select("*").order("name").limit(30);
      const { data } = q.trim()
        ? await query.ilike("name", `%${q.trim()}%`)
        : await query;
      setResults((data ?? []) as Food[]);
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  async function add() {
    if (!selected) return;
    const consumedAt = new Date(date + "T" + new Date().toTimeString().slice(0, 8)).toISOString();
    const { error } = await supabase.from("diet_entries").insert({
      user_id: userId, food_id: selected.id, grams, meal, consumed_at: consumedAt,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Alimento adicionado");
    setOpen(false); setSelected(null); setQ(""); setGrams(100);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="secondary"><Plus className="size-4 mr-1" /> Adicionar</Button></DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Buscar alimento — Tabela TACO</DialogTitle></DialogHeader>
        {!selected ? (
          <>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="ex: arroz, frango, banana..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" autoFocus />
            </div>
            <ul className="max-h-80 overflow-auto divide-y rounded-lg border">
              {results.map((f) => {
                const m = macros(f, 100);
                return (
                  <li key={f.id}>
                    <button onClick={() => setSelected(f)} className="w-full text-left px-3 py-2 hover:bg-muted">
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{Math.round(m.kcal)} kcal · {m.p.toFixed(1)}P/{m.c.toFixed(1)}C/{m.g.toFixed(1)}G por 100g</p>
                    </button>
                  </li>
                );
              })}
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum resultado</li>}
            </ul>
          </>
        ) : (
          <div className="space-y-4">
            <button onClick={() => setSelected(null)} className="text-xs text-primary hover:underline">← outra busca</button>
            <div>
              <p className="font-medium">{selected.name}</p>
              <p className="text-xs text-muted-foreground">{selected.category}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Quantidade (g)</label>
              <Input type="number" value={grams} onChange={(e) => setGrams(Number(e.target.value))} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center bg-muted rounded-lg p-3">
              {(() => { const m = macros(selected, grams); return (
                <>
                  <div><p className="text-xs text-muted-foreground">kcal</p><p className="font-display text-xl">{Math.round(m.kcal)}</p></div>
                  <div><p className="text-xs text-muted-foreground">P</p><p className="font-display text-xl">{m.p.toFixed(1)}</p></div>
                  <div><p className="text-xs text-muted-foreground">C</p><p className="font-display text-xl">{m.c.toFixed(1)}</p></div>
                  <div><p className="text-xs text-muted-foreground">G</p><p className="font-display text-xl">{m.g.toFixed(1)}</p></div>
                </>
              );})()}
            </div>
            <Button onClick={add} className="w-full">Adicionar à refeição</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
