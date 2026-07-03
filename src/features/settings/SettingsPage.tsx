import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellOff, Lock, Unlock, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  changePassword,
  describeEmailUpdateError,
  hasPasswordLogin,
  LEGACY_EMAIL_DOMAIN,
  setPassword,
  useLocalAuth,
} from "@/features/auth/auth";
import { supabase } from "@/integrations/supabase/client";
import { updateProfilePrivacy } from "@/features/profile/follows-api";
import { getStravaWebhookStatus, setupStravaWebhook } from "@/features/workouts/strava-api";
import { timeAgo } from "@/features/feed/format";
import { useStravaConnection } from "@/features/workouts/useStravaConnection";
import {
  getProfileSettings,
  updateNotificationsEnabled,
  updateProfileSettings,
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

  const hasRealEmail = Boolean(user?.email && !user.email.endsWith(LEGACY_EMAIL_DOMAIN));
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [savingRecoveryEmail, setSavingRecoveryEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [settingUpWebhook, setSettingUpWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<{
    active: boolean;
    lastEventAt: string | null;
    lastEventStatus: string | null;
  } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    getStravaWebhookStatus()
      .then(setWebhookStatus)
      .catch(() => setWebhookStatus(null));
  }, [isAdmin]);

  const {
    connected: stravaConnected,
    busy: stravaBusy,
    connect: connectStrava,
    disconnect: disconnectStravaAccount,
  } = useStravaConnection();

  const [isPrivate, setIsPrivate] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  useEffect(() => {
    if (!user) return;
    getProfileSettings(user.id).then((data) => {
      if (!data) return;
      setUsername(data.username);
      setDisplayName(data.display_name);
      setBio(data.bio ?? "");
      setAvatarUrl(data.avatar_url);
      setIsAdmin(data.is_admin);
      setIsPrivate(data.is_private);
      setNotificationsEnabled(data.notifications_enabled);
    });
    setRecoveryEmail(hasRealEmail ? (user.email ?? "") : "");
  }, [hasRealEmail, user]);

  async function updatePrivacy(nextPrivate: boolean) {
    if (!user) return;
    setSavingPrivacy(true);
    try {
      await updateProfilePrivacy(user.id, nextPrivate);
      setIsPrivate(nextPrivate);
      toast.success(nextPrivate ? "Perfil privado ativado" : "Perfil publico ativado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel alterar privacidade");
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function updateNotifications(nextEnabled: boolean) {
    if (!user) return;
    setSavingNotifications(true);
    try {
      await updateNotificationsEnabled(user.id, nextEnabled);
      setNotificationsEnabled(nextEnabled);
      toast.success(nextEnabled ? "Notificacoes ativadas" : "Notificacoes silenciadas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel alterar notificacoes");
    } finally {
      setSavingNotifications(false);
    }
  }

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
    const cleanEmail = recoveryEmail.trim().toLowerCase();
    if (!cleanEmail) return;
    setSavingRecoveryEmail(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: cleanEmail },
        { emailRedirectTo: `${window.location.origin}/feed` },
      );
      if (error) throw new Error(describeEmailUpdateError(error));
      toast.success("Enviamos um link de confirmacao para o novo e-mail");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar o e-mail");
    } finally {
      setSavingRecoveryEmail(false);
    }
  }

  const canChangePassword = hasPasswordLogin(user);

  async function submitChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPassword(true);
    try {
      if (canChangePassword) {
        await changePassword(currentPassword, newPassword);
      } else {
        await setPassword(newPassword);
      }
      setCurrentPassword("");
      setNewPassword("");
      toast.success(
        canChangePassword
          ? "Senha alterada com sucesso!"
          : "Senha definida! Agora voce tambem pode entrar com usuario e senha.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a senha");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSetupWebhook() {
    setSettingUpWebhook(true);
    try {
      const result = await setupStravaWebhook();
      toast.success(
        result.created
          ? "Inscricao do webhook do Strava criada com sucesso."
          : "Webhook do Strava ja estava configurado.",
      );
      getStravaWebhookStatus()
        .then(setWebhookStatus)
        .catch(() => {});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel configurar o webhook");
    } finally {
      setSettingUpWebhook(false);
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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
              {isPrivate ? <Lock className="size-4" /> : <Unlock className="size-4" />}
            </div>
            <div>
              <h2 className="font-display text-2xl">PRIVACIDADE</h2>
              <p className="text-sm text-muted-foreground">
                {isPrivate
                  ? "Suas publicacoes aparecem apenas para seguidores aprovados."
                  : "Suas publicacoes vao para o feed e aparecem para todos os usuarios da plataforma."}
              </p>
            </div>
          </div>
          <Switch
            checked={!isPrivate}
            onCheckedChange={(checked) => updatePrivacy(!checked)}
            disabled={savingPrivacy}
            aria-label="Publicar no feed"
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
              {notificationsEnabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
            </div>
            <div>
              <h2 className="font-display text-2xl">NOTIFICAÇÕES</h2>
              <p className="text-sm text-muted-foreground">
                {notificationsEnabled
                  ? "Voce recebe notificacoes de curtidas e comentarios nas suas publicacoes."
                  : "Notificacoes silenciadas: voce nao recebera avisos de curtidas e comentarios."}
              </p>
            </div>
          </div>
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={updateNotifications}
            disabled={savingNotifications}
            aria-label="Receber notificacoes"
          />
        </div>
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
          {canChangePassword ? (
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
          ) : (
            <p className="text-xs text-muted-foreground">
              Sua conta entra com o Google e ainda nao tem senha. Defina uma para tambem poder
              entrar com usuario e senha (util em outros dispositivos).
            </p>
          )}
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
            {changingPassword
              ? "Salvando..."
              : canChangePassword
                ? "Trocar senha"
                : "Definir senha"}
          </Button>
        </form>

        <form onSubmit={saveRecoveryEmail} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="recovery-email">E-mail da conta</Label>
            <Input
              id="recovery-email"
              type="email"
              placeholder="seu@email.com"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Usado para recuperar sua senha caso voce a esqueca. Ao trocar, enviamos um link de
              confirmacao para o novo e-mail.
            </p>
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={savingRecoveryEmail}>
            {savingRecoveryEmail ? "Salvando..." : "Salvar e-mail"}
          </Button>
        </form>
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-[#FC4C02]/10 p-2 text-[#FC4C02]">
            <Zap className="size-4" />
          </div>
          <div>
            <h2 className="font-display text-2xl">STRAVA</h2>
            <p className="text-sm text-muted-foreground">
              {stravaConnected
                ? "Sua conta do Strava esta conectada. Seus treinos sao importados automaticamente."
                : "Conecte sua conta do Strava para importar seus treinos automaticamente."}
            </p>
          </div>
        </div>
        {stravaConnected === true && (
          <Button
            type="button"
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={disconnectStravaAccount}
            disabled={stravaBusy}
          >
            {stravaBusy ? "Desconectando..." : "Desconectar Strava"}
          </Button>
        )}
        {stravaConnected === false && (
          <Button
            type="button"
            className="w-full bg-[#FC4C02] text-white hover:bg-[#e34402]"
            onClick={connectStrava}
            disabled={stravaBusy}
          >
            <Zap className="mr-2 size-4" />
            {stravaBusy ? "Abrindo..." : "Conectar Strava"}
          </Button>
        )}
      </Card>

      {isAdmin && (
        <Card className="p-6 space-y-3">
          <div>
            <p className="text-sm font-semibold">Integracao Strava (admin)</p>
            <p className="text-sm text-muted-foreground">
              Registra a inscricao do webhook do Strava para que atividades novas sejam importadas
              automaticamente para todos os usuarios conectados.
            </p>
          </div>
          {webhookStatus && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <span
                className={`size-2 shrink-0 rounded-full ${
                  webhookStatus.active ? "bg-green-500" : "bg-destructive"
                }`}
              />
              <span>
                {webhookStatus.active ? "Inscricao ativa" : "Inscricao inativa"}
                {webhookStatus.lastEventAt
                  ? ` - ultimo evento ${timeAgo(webhookStatus.lastEventAt)} (${webhookStatus.lastEventStatus})`
                  : " - nenhum evento recebido ainda"}
              </span>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleSetupWebhook}
            disabled={settingUpWebhook}
          >
            {settingUpWebhook ? "Configurando..." : "Configurar webhook do Strava"}
          </Button>
        </Card>
      )}

      <Card className="p-6">
        <p className="text-sm font-semibold mb-1">E-mail</p>
        <p className="text-sm text-muted-foreground">
          {hasRealEmail ? user?.email : "Nenhum e-mail real cadastrado ainda"}
        </p>
        {user?.new_email && (
          <p className="text-xs text-muted-foreground mb-4">
            Confirmacao pendente para {user.new_email}.
          </p>
        )}
        <Button variant="destructive" onClick={signOut} className="mt-4 w-full">
          Sair da conta
        </Button>
      </Card>
    </div>
  );
}
