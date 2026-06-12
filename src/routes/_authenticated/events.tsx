import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, MapPin, Plus, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [{ title: "Eventos · Lajes Fit" }] }),
  component: EventsPage,
});

type EventRow = {
  id: string; creator_id: string; title: string; description: string | null;
  location: string; event_date: string; distance_km: number | null;
  max_participants: number | null;
  creator: { display_name: string; username: string } | null;
  participants: { user_id: string }[];
};

function EventsPage() {
  const { user } = Route.useRouteContext();
  const [events, setEvents] = useState<EventRow[]>([]);

  async function load() {
    const { data } = await supabase
      .from("events")
      .select("*, creator:profiles!events_creator_id_fkey(display_name, username), participants:event_participants(user_id)")
      .order("event_date", { ascending: true });
    setEvents((data ?? []) as any);
  }
  useEffect(() => { load(); }, []);

  async function toggleJoin(ev: EventRow) {
    const joined = ev.participants.some((p) => p.user_id === user.id);
    if (joined) {
      await supabase.from("event_participants").delete().eq("event_id", ev.id).eq("user_id", user.id);
    } else {
      await supabase.from("event_participants").insert({ event_id: ev.id, user_id: user.id });
    }
    load();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl">EVENTOS</h1>
          <p className="text-sm text-muted-foreground">Corridas e treinões em Lajedão e região</p>
        </div>
        <CreateEventDialog userId={user.id} onCreated={load} />
      </div>

      <div className="grid gap-4">
        {events.length === 0 && <p className="text-center py-16 text-muted-foreground">Nenhum evento criado ainda. Que tal organizar a próxima corrida?</p>}
        {events.map((ev) => {
          const joined = ev.participants.some((p) => p.user_id === user.id);
          const d = new Date(ev.event_date);
          return (
            <article key={ev.id} className="bg-card rounded-2xl border shadow-card overflow-hidden">
              <div className="flex">
                <div className="bg-gradient-primary text-primary-foreground p-4 grid place-items-center min-w-[88px]">
                  <p className="text-xs uppercase">{d.toLocaleDateString("pt-BR", { month: "short" })}</p>
                  <p className="font-display text-4xl leading-none">{d.getDate()}</p>
                  <p className="text-xs mt-1">{d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="p-4 flex-1 min-w-0">
                  <h3 className="font-display text-2xl">{ev.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="size-3" /> {ev.location}</span>
                    {ev.distance_km && <span>· {ev.distance_km} km</span>}
                    <span className="flex items-center gap-1"><Users className="size-3" /> {ev.participants.length}{ev.max_participants ? `/${ev.max_participants}` : ""}</span>
                  </div>
                  {ev.description && <p className="text-sm mt-2 line-clamp-2">{ev.description}</p>}
                  <p className="text-xs text-muted-foreground mt-2">por @{ev.creator?.username}</p>
                  <Button onClick={() => toggleJoin(ev)} size="sm" variant={joined ? "outline" : "default"} className="mt-3">
                    {joined ? "Cancelar inscrição" : "Participar"}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function CreateEventDialog({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("events").insert({
      creator_id: userId,
      title: String(fd.get("title")),
      description: String(fd.get("description") || "") || null,
      location: String(fd.get("location")),
      event_date: new Date(String(fd.get("event_date"))).toISOString(),
      distance_km: fd.get("distance_km") ? Number(fd.get("distance_km")) : null,
      max_participants: fd.get("max_participants") ? Number(fd.get("max_participants")) : null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Evento criado!");
    setOpen(false); onCreated();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4 mr-2" /> Criar evento</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Criar evento de corrida</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input name="title" placeholder="Nome do evento" required maxLength={100} />
          <Input name="location" placeholder="Local (ex: Praça da Matriz, Lajedão)" required maxLength={120} />
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-muted-foreground">Data e hora</label><Input name="event_date" type="datetime-local" required /></div>
            <div><label className="text-xs text-muted-foreground">Distância (km)</label><Input name="distance_km" type="number" step="0.1" placeholder="5" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground">Limite de participantes (opcional)</label><Input name="max_participants" type="number" placeholder="50" /></div>
          <Textarea name="description" placeholder="Detalhes, ponto de encontro, regras..." maxLength={500} rows={3} />
          <Button type="submit" className="w-full">Criar evento</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
