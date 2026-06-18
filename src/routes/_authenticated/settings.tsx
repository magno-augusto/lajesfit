import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações - Lajes Fit" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("username, display_name, bio, avatar_url").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setUsername(data.username);
        setDisplayName(data.display_name);
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatar_url);
      });
  }, [user.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      bio: bio || null,
      avatar_url: avatarUrl,
    }).eq("id", user.id);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Perfil atualizado!");
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const path = `${user.id}/avatar-${Date.now()}`;
    const { error: upErr } = await supabase.storage.from("media").upload(path, f, { upsert: true });
    if (upErr) { toast.error("Erro no upload"); setUploading(false); return; }
    const { data: signed } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    const url = signed?.signedUrl ?? null;
    setAvatarUrl(url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setUploading(false);
    toast.success("Foto atualizada!");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="font-display text-4xl">CONFIGURAÇÕES</h1>

      <Card className="p-6 space-y-4">
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-20 border-4 border-primary/30">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className="text-2xl">{(displayName || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
              <Button type="button" variant="outline" asChild><span>{uploading ? "Enviando..." : "Trocar foto"}</span></Button>
            </label>
          </div>

          <div className="space-y-2"><Label>Usuário</Label><Input value={username} disabled /></div>
          <div className="space-y-2"><Label htmlFor="dn">Nome</Label><Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="bio">Bio</Label><Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} /></div>

          <Button type="submit" disabled={loading} className="w-full">{loading ? "Salvando..." : "Salvar"}</Button>
        </form>
      </Card>

      <Card className="p-6">
        <p className="text-sm font-semibold mb-1">E-mail</p>
        <p className="text-sm text-muted-foreground mb-4">{user.email}</p>
        <Button variant="destructive" onClick={signOut} className="w-full">Sair da conta</Button>
      </Card>
    </div>
  );
}
