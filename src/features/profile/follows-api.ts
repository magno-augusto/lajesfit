import { supabase } from "@/integrations/supabase/client";

export type FollowProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
};

export type IncomingFollowRequest = {
  requester_id: string;
  created_at: string;
  profile: FollowProfile;
};

export async function fetchIncomingFollowRequests(
  userId: string,
): Promise<IncomingFollowRequest[]> {
  const { data: requests, error } = await supabase
    .from("follow_requests")
    .select("requester_id, created_at")
    .eq("requested_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const requesterIds = (requests ?? []).map((request) => request.requester_id);
  if (requesterIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, is_private")
    .in("id", requesterIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map((profiles ?? []).map((item) => [item.id, item]));
  return (requests ?? [])
    .map((request) => {
      const requesterProfile = profileMap.get(request.requester_id);
      if (!requesterProfile) return null;
      return {
        requester_id: request.requester_id,
        created_at: request.created_at,
        profile: requesterProfile,
      };
    })
    .filter((request): request is IncomingFollowRequest => Boolean(request));
}

export async function sendFollowOrRequest(currentUserId: string, targetProfile: FollowProfile) {
  if (targetProfile.is_private) {
    const { error } = await supabase
      .from("follow_requests")
      .insert({ requester_id: currentUserId, requested_id: targetProfile.id });
    if (error) throw error;
    return "requested" as const;
  }

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: currentUserId, following_id: targetProfile.id });
  if (error) throw error;
  return "following" as const;
}

export async function updateProfilePrivacy(userId: string, isPrivate: boolean) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_private: isPrivate })
    .eq("id", userId);
  if (error) throw error;
}

export async function cancelFollowRequest(currentUserId: string, targetProfileId: string) {
  const { error } = await supabase
    .from("follow_requests")
    .delete()
    .eq("requester_id", currentUserId)
    .eq("requested_id", targetProfileId);
  if (error) throw error;
}

export async function unfollowProfile(currentUserId: string, targetProfileId: string) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", currentUserId)
    .eq("following_id", targetProfileId);
  if (error) throw error;
}

export async function acceptFollowRequest(currentUserId: string, requesterId: string) {
  const { error: followError } = await supabase
    .from("follows")
    .insert({ follower_id: requesterId, following_id: currentUserId });
  if (followError) throw followError;

  const { error } = await supabase
    .from("follow_requests")
    .delete()
    .eq("requester_id", requesterId)
    .eq("requested_id", currentUserId);
  if (error) throw error;
}

export async function declineFollowRequest(currentUserId: string, requesterId: string) {
  const { error } = await supabase
    .from("follow_requests")
    .delete()
    .eq("requester_id", requesterId)
    .eq("requested_id", currentUserId);
  if (error) throw error;
}
