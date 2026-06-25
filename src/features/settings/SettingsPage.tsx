import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { changePassword, useLocalAuth } from "@/features/auth/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getProfileSettings,
  updateProfileSettings,
  updateRecoveryEmail,
  uploadAvatar,
} from "./settings-api";

export function SettingsPage() {
  const { user } = useLocalAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [savingRecoveryEmail, setSavingRecoveryEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    getProfileSettings(user.id).then((data) => {
      if (!data) return;
      setUsername(data.username);
      setDisplayName(data.display_name);
      setBio(data.bio ?? "");
      setAvatarUrl(data.avatar_url);
      setRecoveryEmail(data.recovery_email ?? "");
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

  async function saveRecoveryEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingRecoveryEmail(true);
    try {
      await updateRecoveryEmail(user.id, recoveryEmail.trim() || null);
      toast.success("E-mail de contato atualizado!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar o e-mail");
    } finally {
      setSavingRecoveryEmail(false);
    }
  }

  async function submitChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Senha alterada com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel trocar a senha");
    } finally {
      setChangingPassword(false);
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

      <Card className="p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold">Segurança</p>
          <p className="text-sm text-muted-foreground">
            Troque sua senha ou cadastre um e-mail de contato para recuperar sua conta caso esqueça
            a senha.
          </p>
        </div>

        <form onSubmit={submitChangePassword} className="space-y-3 border-b pb-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Senha atual</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={changingPassword}>
            {changingPassword ? "Trocando..." : "Trocar senha"}
          </Button>
        </form>

        <form onSubmit={saveRecoveryEmail} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="recovery-email">E-mail de contato (opcional)</Label>
            <Input
              id="recovery-email"
              type="email"
              placeholder="seu@email.com"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Usado para identificar sua conta caso voce precise de ajuda para recuperar o acesso.
            </p>
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={savingRecoveryEmail}>
            {savingRecoveryEmail ? "Salvando..." : "Salvar e-mail de contato"}
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
