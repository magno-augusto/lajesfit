import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Food = { id: number; name: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number };

type Entry = {
  id: string;
  food_name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal: string;
  consumed_at: string;
};

const MEALS = ["Café da manhã", "Almoço", "Lanche", "Jantar", "Ceia"];

export const Route = createFileRoute("/_authenticated/diet")({
  head: () => ({ meta: [{ title: "Dieta - Lajes Fit" }] }),
  component: DietPage,
});

function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function DietPage() {
  const { user } = Route.useRouteContext();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { start, end } = todayRange();
    const { data } = await supabase
      .from("diet_entries")
      .select("id, food_name, grams, kcal, protein_g, carbs_g, fat_g, meal, consumed_at")
      .eq("user_id", user.id)
      .gte("consumed_at", start)
      .lte("consumed_at", end)
      .order("consumed_at", { ascending: true });
    setEntries(data ?? []);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  async function removeEntry(id: string) {
    const { error } = await supabase.from("diet_entries").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    load();
  }

  const totals = useMemo(() => {
    const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    (entries ?? []).forEach((e) => { t.kcal += Number(e.kcal); t.protein += Number(e.protein_g); t.carbs += Number(e.carbs_g); t.fat += Number(e.fat_g); });
    return t;
  }, [entries]);

  const byMeal = useMemo(() => {
    const m: Record<string, Entry[]> = {};
    (entries ?? []).forEach((e) => { (m[e.meal] ??= []).push(e); });
    return m;
  }, [entries]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl">DIETA DE HOJE</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <AddEntryDialog userId={user.id} open={open} setOpen={setOpen} onAdded={load} />
      </header>

      <Card className="p-4 grid grid-cols-4 gap-2 text-center">
        <div><p className="font-display text-3xl text-primary">{Math.round(totals.kcal)}</p><p className="text-xs text-muted-foreground">kcal</p></div>
        <div><p className="font-display text-3xl">{Math.round(totals.protein)}<span className="text-sm">g</span></p><p className="text-xs text-muted-foreground">Proteína</p></div>
        <div><p className="font-display text-3xl">{Math.round(totals.carbs)}<span className="text-sm">g</span></p><p className="text-xs text-muted-foreground">Carbo</p></div>
        <div><p className="font-display text-3xl">{Math.round(totals.fat)}<span className="text-sm">g</span></p><p className="text-xs text-muted-foreground">Gordura</p></div>
      </Card>

      {entries === null ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : entries.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <p className="font-display text-2xl">NADA REGISTRADO HOJE</p>
          <p className="text-sm mt-1">Clique em "Adicionar" pra começar.</p>
        </Card>
      ) : (
        MEALS.filter((m) => byMeal[m]?.length).map((meal) => (
          <div key={meal} className="space-y-2">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground px-2">{meal}</h2>
            {byMeal[meal].map((e) => (
              <Card key={e.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{e.food_name}</p>
                  <p className="text-xs text-muted-foreground">{Number(e.grams)}g · {Math.round(Number(e.kcal))} kcal · P {Math.round(Number(e.protein_g))}g · C {Math.round(Number(e.carbs_g))}g · G {Math.round(Number(e.fat_g))}g</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeEntry(e.id)}><Trash2 className="size-4 text-destructive" /></Button>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function AddEntryDialog({ userId, open, setOpen, onAdded }: { userId: string; open: boolean; setOpen: (b: boolean) => void; onAdded: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState("Almoço");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      const { data } = await supabase
        .from("taco_foods")
        .select("id, name, kcal, protein_g, carbs_g, fat_g")
        .ilike("name", `%${query}%`)
        .limit(20);
      setResults(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  async function save() {
    if (!selected) return;
    const factor = grams / 100;
    setLoading(true);
    const { error } = await supabase.from("diet_entries").insert({
      user_id: userId,
      food_id: selected.id,
      food_name: selected.name,
      grams,
      kcal: Number(selected.kcal) * factor,
      protein_g: Number(selected.protein_g) * factor,
      carbs_g: Number(selected.carbs_g) * factor,
      fat_g: Number(selected.fat_g) * factor,
      meal,
    });
    setLoading(false);
    if (error) { toast.error("Erro ao adicionar"); return; }
    toast.success("Alimento adicionado!");
    setSelected(null); setQuery(""); setResults([]); setOpen(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4 mr-2" /> Adicionar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar alimento</DialogTitle></DialogHeader>
        {!selected ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar (arroz, frango, banana...)" className="pl-9" autoFocus />
            </div>
            <div className="max-h-72 overflow-auto space-y-1">
              {results.map((f) => (
                <button key={f.id} onClick={() => setSelected(f)} className="w-full text-left p-2 rounded hover:bg-muted">
                  <p className="font-medium text-sm">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{Math.round(Number(f.kcal))} kcal / 100g</p>
                </button>
              ))}
              {query.length >= 2 && results.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum alimento encontrado</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="font-semibold">{selected.name}</p>
              <p className="text-xs text-muted-foreground">{Math.round(Number(selected.kcal))} kcal por 100g</p>
            </div>
            <div className="space-y-2"><Label>Quantidade (g)</Label><Input type="number" min={1} value={grams} onChange={(e) => setGrams(Number(e.target.value))} /></div>
            <div className="space-y-2">
              <Label>Refeição</Label>
              <Select value={meal} onValueChange={setMeal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MEALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="text-sm bg-muted rounded p-3">
              <p>Total: <strong>{Math.round(Number(selected.kcal) * grams / 100)} kcal</strong></p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelected(null)} className="flex-1">Voltar</Button>
              <Button onClick={save} disabled={loading} className="flex-1">{loading ? "Salvando..." : "Adicionar"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
