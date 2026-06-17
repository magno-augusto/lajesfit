import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configuracoes - Lajes Fit" }] }),
  component: SettingsPage,
});

type ProfileForm = {
  username: string;
  display_name: string;
  bio: string;
  city: string;
  avatar_url: string;
};

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const [profile, setProfile] = useState<ProfileForm | null>(null);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("username, display_name, bio, city, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) =>
        setProfile({
          username: data?.username ?? "",
          display_name: data?.display_name ?? "",
          bio: data?.bio ?? "",
          city: data?.city ?? "",
          avatar_url: data?.avatar_url ?? "",
        }),
      );
    supabase
      .from("strava_tokens")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setStravaConnected(!!data));
  }, [user.id]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        bio: profile.bio || null,
        city: profile.city || null,
        avatar_url: profile.avatar_url || null,
      })
      .eq("id", user.id);
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Perfil atualizado!");
  }

  async function uploadAvatar(file: File) {
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error(uploadError.message);
      return;
    }

    const { data: signed } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signed?.signedUrl) {
      setProfile((current) => current ? { ...current, avatar_url: signed.signedUrl } : current);
      await supabase.from("profiles").update({ avatar_url: signed.signedUrl }).eq("id", user.id);
      toast.success("Avatar atualizado");
    }
  }

  function connectStrava() {
    toast.info("A integracao com Strava precisa do Client ID e Client Secret do app Strava.");
  }

  if (!profile) return <div className="max-w-2xl mx-auto"><p className="text-muted-foreground">Carregando...</p></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <section className="bg-card rounded-2xl border shadow-card p-6">
        <h2 className="font-display text-2xl mb-4">PERFIL</h2>
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center gap-4">
            <img
              src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.display_name}`}
              alt=""
              className="size-20 rounded-full object-cover border-2 border-primary/30"
            />
            <label className="text-sm">
              <span className="text-primary hover:underline cursor-pointer">Trocar foto</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
              />
            </label>
          </div>
          <div>
            <Label>Usuario</Label>
            <Input value={profile.username} disabled />
          </div>
          <div>
            <Label>Nome</Label>
            <Input
              value={profile.display_name}
              onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              maxLength={60}
              required
            />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input
              value={profile.city}
              onChange={(e) => setProfile({ ...profile, city: e.target.value })}
              placeholder="Lajedao-BA"
              maxLength={80}
            />
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              maxLength={300}
              rows={3}
              placeholder="Conte um pouco sobre voce"
            />
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
        </form>
      </section>

      <section className="bg-card rounded-2xl border shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-lg bg-[#FC4C02] grid place-items-center text-white">
            <Zap className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl leading-none">STRAVA</h2>
            <p className="text-xs text-muted-foreground">Importar treinos automaticamente</p>
          </div>
          {stravaConnected && <CheckCircle2 className="size-5 text-success ml-auto" />}
        </div>
        {stravaConnected ? (
          <p className="text-sm text-muted-foreground">
            Conta conectada. Seus novos treinos do Strava aparecerao no feed e nos seus stats.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              A integracao com Strava precisa de um app cadastrado no portal do Strava.
            </p>
            <Button onClick={connectStrava} variant="outline">Configurar Strava</Button>
          </>
        )}
      </section>
    </div>
  );
}
