import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLocalAuth } from "@/features/auth/auth";
import { getProfileSettings, updateProfileSettings, uploadAvatar } from "./settings-api";

export function SettingsPage() {
  const { user } = useLocalAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    getProfileSettings(user.id).then((data) => {
      if (!data) return;
      setUsername(data.username);
      setDisplayName(data.display_name);
      setBio(data.bio ?? "");
      setAvatarUrl(data.avatar_url);
    });
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateProfileSettings(user.id, {
        display_name: displayName,
        bio: bio || null,
        avatar_url: avatarUrl,
      });
      toast.success("Perfil atualizado!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar o perfil");
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, file);
      setAvatarUrl(url);
      toast.success("Foto atualizada!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!user) return <div className="min-h-screen bg-muted/40" />;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="font-display text-4xl">CONFIGURAÇÕES</h1>

      <Card className="p-6 space-y-4">
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-20 border-4 border-primary/30">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className="text-2xl">
                {(displayName || "?").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
              <Button type="button" variant="outline" asChild>
                <span>{uploading ? "Enviando..." : "Trocar foto"}</span>
              </Button>
            </label>
          </div>

          <div className="space-y-2">
            <Label>Usuário</Label>
            <Input value={username} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dn">Nome</Label>
            <Input
              id="dn"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <p className="text-sm font-semibold mb-1">E-mail</p>
        <p className="text-sm text-muted-foreground mb-4">{user?.email}</p>
        <Button variant="destructive" onClick={signOut} className="w-full">
          Sair da conta
        </Button>
      </Card>
    </div>
  );
}
