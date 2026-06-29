import { notFound, useNavigate, useParams } from "@tanstack/react-router";
import { Check, Clock, Lock, LogOut, Unlock, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PostCard } from "@/features/feed/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { deletePost, fetchProfilePosts, type FeedPost } from "@/features/feed/feed-api";
import { logout, useLocalAuth } from "@/features/auth/auth";
import {
  acceptFollowRequest,
  cancelFollowRequest,
  declineFollowRequest,
  fetchIncomingFollowRequests,
  sendFollowOrRequest,
  unfollowProfile,
  updateProfilePrivacy,
  type FollowProfile as Profile,
  type IncomingFollowRequest as IncomingRequest,
} from "./follows-api";

type FollowStatus = "none" | "requested" | "following";

export function ProfilePage() {
  const { username } = useParams({ from: "/_authenticated/profile/$username" });
  const navigate = useNavigate();
  const { user } = useLocalAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ followers: 0, following: 0, workouts: 0, posts: 0 });
  const [followStatus, setFollowStatus] = useState<FollowStatus>("none");
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: nextProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, is_private")
      .eq("username", username)
      .maybeSingle();

    if (profileError) {
      setLoading(false);
      throw profileError;
    }

    if (!nextProfile) {
      setProfile(null);
      setLoading(false);
      throw notFound();
    }

    setProfile(nextProfile);
    const isMe = nextProfile.id === user.id;

    const [
      { count: followers },
      { count: following },
      { count: workouts },
      { count: posts },
      { data: acceptedFollow },
      { data: pendingRequest },
    ] = await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", nextProfile.id),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", nextProfile.id),
      supabase
        .from("workouts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", nextProfile.id),
      supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", nextProfile.id),
      supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", nextProfile.id)
        .eq("follower_id", user.id)
        .maybeSingle(),
      supabase
        .from("follow_requests")
        .select("requester_id")
        .eq("requested_id", nextProfile.id)
        .eq("requester_id", user.id)
        .maybeSingle(),
    ]);

    setCounts({
      followers: followers ?? 0,
      following: following ?? 0,
      workouts: workouts ?? 0,
      posts: posts ?? 0,
    });

    if (acceptedFollow) setFollowStatus("following");
    else if (pendingRequest) setFollowStatus("requested");
    else setFollowStatus("none");

    const canViewPosts = isMe || Boolean(acceptedFollow) || !nextProfile.is_private;
    if (canViewPosts) setPosts(await fetchProfilePosts(nextProfile.id, user.id));
    else setPosts([]);

    if (isMe) {
      setIncomingRequests(await fetchIncomingFollowRequests(user.id));
    } else {
      setIncomingRequests([]);
    }

    setLoading(false);
  }, [username, user]);

  useEffect(() => {
    load().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar o perfil");
      setLoading(false);
    });
  }, [load]);

  async function followOrRequest() {
    if (!profile || !user) return;
    setBusyId(profile.id);
    try {
      const status = await sendFollowOrRequest(user.id, profile);
      setFollowStatus(status);
      if (status === "following") {
        setCounts((current) => ({ ...current, followers: current.followers + 1 }));
        toast.success("Agora voce segue este perfil");
      } else {
        toast.success("Solicitacao enviada");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel seguir");
    } finally {
      setBusyId(null);
    }
  }

  async function updatePrivacy(nextPrivate: boolean) {
    if (!profile || !user || profile.id !== user.id) return;
    setBusyId(profile.id);
    try {
      await updateProfilePrivacy(user.id, nextPrivate);
      setProfile((current) => (current ? { ...current, is_private: nextPrivate } : current));
      toast.success(nextPrivate ? "Perfil privado ativado" : "Perfil publico ativado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel alterar privacidade");
    } finally {
      setBusyId(null);
    }
  }

  async function cancelRequest() {
    if (!profile || !user) return;
    setBusyId(profile.id);
    try {
      await cancelFollowRequest(user.id, profile.id);
      setFollowStatus("none");
      toast.success("Solicitacao cancelada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel cancelar");
    } finally {
      setBusyId(null);
    }
  }

  async function unfollow() {
    if (!profile || !user) return;
    setBusyId(profile.id);
    try {
      await unfollowProfile(user.id, profile.id);
      setFollowStatus("none");
      setCounts((current) => ({ ...current, followers: Math.max(0, current.followers - 1) }));
      toast.success("Voce deixou de seguir");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel deixar de seguir");
    } finally {
      setBusyId(null);
    }
  }

  async function acceptRequest(requesterId: string) {
    if (!user) return;
    setBusyId(requesterId);
    try {
      await acceptFollowRequest(user.id, requesterId);
      setIncomingRequests((current) =>
        current.filter((request) => request.requester_id !== requesterId),
      );
      setCounts((current) => ({ ...current, followers: current.followers + 1 }));
      toast.success("Solicitacao aceita");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel aceitar");
    } finally {
      setBusyId(null);
    }
  }

  async function declineRequest(requesterId: string) {
    if (!user) return;
    setBusyId(requesterId);
    try {
      await declineFollowRequest(user.id, requesterId);
      setIncomingRequests((current) =>
        current.filter((request) => request.requester_id !== requesterId),
      );
      toast.success("Solicitacao recusada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel recusar");
    } finally {
      setBusyId(null);
    }
  }

  if (!user || loading) return <Skeleton className="mx-auto h-64 max-w-2xl rounded-2xl" />;
  if (!profile) return <p className="py-20 text-center">Perfil nao encontrado</p>;

  const isMe = profile.id === user.id;
  const canViewPosts = isMe || followStatus === "following" || !profile.is_private;

  async function handleLogout() {
    await logout();
    navigate({ to: "/auth", replace: true });
  }

  async function handleDeletePost(post: FeedPost) {
    if (!user || post.user_id !== user.id) return;

    await deletePost(post.id, user.id);
    setPosts((currentPosts) => currentPosts.filter((item) => item.id !== post.id));
    setCounts((current) => ({ ...current, posts: Math.max(0, current.posts - 1) }));
    toast.success("Publicacao excluida");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-20 border-4 border-primary/30">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="text-2xl">
              {profile.display_name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl">{profile.display_name}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
          {!isMe && (
            <FollowButton
              status={followStatus}
              isPrivate={profile.is_private}
              disabled={busyId === profile.id}
              onFollowOrRequest={followOrRequest}
              onCancelRequest={cancelRequest}
              onUnfollow={unfollow}
            />
          )}
        </div>
        {profile.bio && <p className="mt-4 text-sm">{profile.bio}</p>}
        <div className="mt-6 grid grid-cols-4 gap-2 text-center">
          <Stat label="Posts" value={counts.posts} />
          <Stat label="Treinos" value={counts.workouts} />
          <Stat label="Seguidores" value={counts.followers} />
          <Stat label="Seguindo" value={counts.following} />
        </div>
      </Card>

      {isMe && (
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                {profile.is_private ? <Lock className="size-4" /> : <Unlock className="size-4" />}
              </div>
              <div>
                <h2 className="font-display text-2xl">PRIVACIDADE</h2>
                <p className="text-sm text-muted-foreground">
                  {profile.is_private
                    ? "Suas publicacoes aparecem apenas para seguidores aprovados."
                    : "Suas publicacoes aparecem para todos os usuarios da plataforma."}
                </p>
              </div>
            </div>
            <Switch
              checked={profile.is_private}
              onCheckedChange={updatePrivacy}
              disabled={busyId === profile.id}
              aria-label="Privar perfil"
            />
          </div>
        </Card>
      )}

      {isMe && (
        <Card className="p-6">
          <Button variant="outline" className="w-full" onClick={() => void handleLogout()}>
            <LogOut className="mr-2 size-4" />
            Sair da conta
          </Button>
        </Card>
      )}

      {isMe && profile.is_private && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">SOLICITACOES</h2>
              <p className="text-sm text-muted-foreground">
                Aprove quem pode ver suas publicacoes no feed.
              </p>
            </div>
            {incomingRequests.length > 0 && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {incomingRequests.length}
              </span>
            )}
          </div>

          {incomingRequests.length === 0 ? (
            <p className="rounded-lg border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhuma solicitacao pendente
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {incomingRequests.map((request) => (
                <li key={request.requester_id} className="flex items-center gap-3 p-3">
                  <Avatar className="size-10">
                    <AvatarImage src={request.profile.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {request.profile.display_name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{request.profile.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{request.profile.username}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => acceptRequest(request.requester_id)}
                    disabled={busyId === request.requester_id}
                    aria-label="Aceitar solicitacao"
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => declineRequest(request.requester_id)}
                    disabled={busyId === request.requester_id}
                    aria-label="Recusar solicitacao"
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-2xl">PUBLICACOES</h2>
        {!canViewPosts ? (
          <Card className="px-4 py-8 text-center">
            <Lock className="mx-auto mb-3 size-7 text-muted-foreground" />
            <p className="font-medium">Perfil privado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Solicite para seguir e ver as publicacoes deste perfil.
            </p>
          </Card>
        ) : posts.length === 0 ? (
          <Card className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhuma publicacao ainda
          </Card>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user.id}
              onDelete={post.user_id === user.id ? handleDeletePost : undefined}
            />
          ))
        )}
      </section>
    </div>
  );
}

function FollowButton({
  status,
  isPrivate,
  disabled,
  onFollowOrRequest,
  onCancelRequest,
  onUnfollow,
}: {
  status: FollowStatus;
  isPrivate: boolean;
  disabled: boolean;
  onFollowOrRequest: () => void;
  onCancelRequest: () => void;
  onUnfollow: () => void;
}) {
  if (status === "following") {
    return (
      <Button onClick={onUnfollow} variant="outline" disabled={disabled}>
        Seguindo
      </Button>
    );
  }

  if (status === "requested") {
    return (
      <Button onClick={onCancelRequest} variant="secondary" disabled={disabled}>
        <Clock className="mr-2 size-4" />
        Solicitado
      </Button>
    );
  }

  return (
    <Button onClick={onFollowOrRequest} disabled={disabled}>
      <UserPlus className="mr-2 size-4" />
      {isPrivate ? "Solicitar" : "Seguir"}
    </Button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-2xl">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
