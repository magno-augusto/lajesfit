import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [{ title: "Eventos - Lajes Fit" }] }),
  component: EventsPage,
});

type EventRow = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  location: string;
  event_date: string;
  distance_km: number | null;
  max_participants: number | null;
  creator: { display_name: string; username: string } | null;
  participants: { user_id: string }[];
};

function EventsPage() {
  const { user } = Route.useRouteContext();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*, creator:profiles!events_creator_id_fkey(display_name, username), participants:event_participants(user_id)")
      .order("event_date", { ascending: true });
    if (error) toast.error(error.message);
    setEvents((data ?? []) as EventRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleJoin(event: EventRow) {
    const joined = event.participants.some((participant) => participant.user_id === user.id);
    const { error } = joined
      ? await supabase.from("event_participants").delete().eq("event_id", event.id).eq("user_id", user.id)
      : await supabase.from("event_participants").insert({ event_id: event.id, user_id: user.id });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(joined ? "Inscricao cancelada" : "Inscricao confirmada");
    load();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">EVENTOS</h1>
          <p className="text-sm text-muted-foreground">Corridas e treinoes em Lajedao e regiao</p>
        </div>
        <CreateEventDialog userId={user.id} onCreated={load} />
      </div>

      <div className="grid gap-4">
        {loading && <p className="text-center py-16 text-muted-foreground">Carregando eventos...</p>}
        {!loading && events.length === 0 && (
          <p className="text-center py-16 text-muted-foreground">
            Nenhum evento criado ainda. Que tal organizar a proxima corrida?
          </p>
        )}
        {events.map((event) => {
          const joined = event.participants.some((participant) => participant.user_id === user.id);
          const date = new Date(event.event_date);
          return (
            <article key={event.id} className="bg-card rounded-2xl border shadow-card overflow-hidden">
              <div className="flex">
                <div className="bg-gradient-primary text-primary-foreground p-4 grid place-items-center min-w-[88px]">
                  <p className="text-xs uppercase">{date.toLocaleDateString("pt-BR", { month: "short" })}</p>
                  <p className="font-display text-4xl leading-none">{date.getDate()}</p>
                  <p className="text-xs mt-1">{date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="p-4 flex-1 min-w-0">
                  <h3 className="font-display text-2xl">{event.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="size-3" /> {event.location}</span>
                    {event.distance_km && <span>{event.distance_km} km</span>}
                    <span className="flex items-center gap-1">
                      <Users className="size-3" /> {event.participants.length}
                      {event.max_participants ? `/${event.max_participants}` : ""}
                    </span>
                  </div>
                  {event.description && <p className="text-sm mt-2 line-clamp-2">{event.description}</p>}
                  <p className="text-xs text-muted-foreground mt-2">por @{event.creator?.username ?? "atleta"}</p>
                  <Button onClick={() => toggleJoin(event)} size="sm" variant={joined ? "outline" : "default"} className="mt-3">
                    {joined ? "Cancelar inscricao" : "Participar"}
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
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setLoading(true);
    const { error } = await supabase.from("events").insert({
      creator_id: userId,
      title: String(fd.get("title")),
      description: String(fd.get("description") || "") || null,
      location: String(fd.get("location")),
      event_date: new Date(String(fd.get("event_date"))).toISOString(),
      distance_km: fd.get("distance_km") ? Number(fd.get("distance_km")) : null,
      max_participants: fd.get("max_participants") ? Number(fd.get("max_participants")) : null,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Evento criado!");
    form.reset();
    setOpen(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4 mr-2" /> Criar evento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-5" /> Criar evento de corrida
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input name="title" placeholder="Nome do evento" required maxLength={100} />
          <Input name="location" placeholder="Local, ex: Praca da Matriz, Lajedao" required maxLength={120} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Data e hora</label>
              <Input name="event_date" type="datetime-local" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Distancia (km)</label>
              <Input name="distance_km" type="number" min="0" step="0.1" placeholder="5" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Limite de participantes</label>
            <Input name="max_participants" type="number" min="1" step="1" placeholder="50" />
          </div>
          <Textarea name="description" placeholder="Detalhes, ponto de encontro, regras..." maxLength={500} rows={3} />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar evento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
