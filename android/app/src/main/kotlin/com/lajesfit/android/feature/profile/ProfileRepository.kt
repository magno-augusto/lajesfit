package com.lajesfit.android.feature.profile

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
private data class ProfileChromeRow(
    val id: String,
    val username: String,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
) {
    fun toSummary() = ProfileChromeSummary(
        id = id,
        username = username,
        displayName = displayName,
        avatarUrl = avatarUrl,
    )
}

@Serializable
private data class UserProfileRow(
    val id: String,
    val username: String,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val bio: String? = null,
    @SerialName("is_private") val isPrivate: Boolean = false,
) {
    fun toProfile() = UserProfile(
        id = id,
        username = username,
        displayName = displayName ?: username,
        avatarUrl = avatarUrl,
        bio = bio,
        isPrivate = isPrivate,
    )
}

@Serializable
private data class FollowIdRow(
    @SerialName("follower_id") val followerId: String? = null,
    @SerialName("requester_id") val requesterId: String? = null,
)

@Serializable
private data class FollowRequestRow(
    @SerialName("requester_id") val requesterId: String,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
private data class FollowInsert(
    @SerialName("follower_id") val followerId: String,
    @SerialName("following_id") val followingId: String,
)

@Serializable
private data class FollowRequestInsert(
    @SerialName("requester_id") val requesterId: String,
    @SerialName("requested_id") val requestedId: String,
)

@Serializable
private data class ProfileSearchRow(
    val id: String,
    val username: String,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
) {
    fun toSearchResult() = ProfileSearchResult(
        id = id,
        username = username,
        displayName = displayName ?: username,
        avatarUrl = avatarUrl,
    )
}

@Singleton
class ProfileRepository @Inject constructor(
    private val supabaseClient: SupabaseClient,
) {

    fun currentUserId(): String? = supabaseClient.auth.currentUserOrNull()?.id

    suspend fun currentProfileSummary(): ProfileChromeSummary? {
        val userId = currentUserId() ?: return null
        return supabaseClient.postgrest.from("profiles")
            .select(columns = Columns.list("id", "username", "display_name", "avatar_url")) {
                filter { eq("id", userId) }
            }
            .decodeSingleOrNull<ProfileChromeRow>()
            ?.toSummary()
    }

    suspend fun getProfileByUsername(username: String): UserProfile? {
        return supabaseClient.postgrest.from("profiles")
            .select(columns = PROFILE_COLUMNS) {
                filter { eq("username", username) }
            }
            .decodeSingleOrNull<UserProfileRow>()
            ?.toProfile()
    }

    suspend fun getProfileCounts(profileId: String): ProfileCounts {
        return ProfileCounts(
            followers = countRows("follows", "following_id", profileId),
            following = countRows("follows", "follower_id", profileId),
            workouts = countRows("workouts", "user_id", profileId),
            posts = countRows("posts", "user_id", profileId),
        )
    }

    suspend fun getFollowStatus(profileId: String, currentUserId: String): FollowStatus {
        val acceptedFollow = supabaseClient.postgrest.from("follows")
            .select(columns = Columns.list("follower_id")) {
                filter {
                    eq("following_id", profileId)
                    eq("follower_id", currentUserId)
                }
            }
            .decodeSingleOrNull<FollowIdRow>()

        if (acceptedFollow != null) return FollowStatus.FOLLOWING

        val pendingRequest = supabaseClient.postgrest.from("follow_requests")
            .select(columns = Columns.list("requester_id")) {
                filter {
                    eq("requested_id", profileId)
                    eq("requester_id", currentUserId)
                }
            }
            .decodeSingleOrNull<FollowIdRow>()

        return if (pendingRequest != null) FollowStatus.REQUESTED else FollowStatus.NONE
    }

    suspend fun fetchIncomingFollowRequests(userId: String): List<IncomingFollowRequest> {
        val requests = supabaseClient.postgrest.from("follow_requests")
            .select(columns = Columns.list("requester_id", "created_at")) {
                filter { eq("requested_id", userId) }
                order("created_at", Order.DESCENDING)
            }
            .decodeList<FollowRequestRow>()

        val requesterIds = requests.map { it.requesterId }
        if (requesterIds.isEmpty()) return emptyList()

        val profiles = supabaseClient.postgrest.from("profiles")
            .select(columns = PROFILE_COLUMNS) {
                filter { isIn("id", requesterIds) }
            }
            .decodeList<UserProfileRow>()
            .associate { it.id to it.toProfile() }

        return requests.mapNotNull { request ->
            val profile = profiles[request.requesterId] ?: return@mapNotNull null
            IncomingFollowRequest(
                requesterId = request.requesterId,
                createdAt = request.createdAt,
                profile = profile,
            )
        }
    }

    suspend fun sendFollowOrRequest(currentUserId: String, targetProfile: UserProfile): FollowStatus {
        return if (targetProfile.isPrivate) {
            supabaseClient.postgrest.from("follow_requests")
                .insert(FollowRequestInsert(requesterId = currentUserId, requestedId = targetProfile.id))
            FollowStatus.REQUESTED
        } else {
            supabaseClient.postgrest.from("follows")
                .insert(FollowInsert(followerId = currentUserId, followingId = targetProfile.id))
            FollowStatus.FOLLOWING
        }
    }

    suspend fun cancelFollowRequest(currentUserId: String, targetProfileId: String) {
        supabaseClient.postgrest.from("follow_requests").delete {
            filter {
                eq("requester_id", currentUserId)
                eq("requested_id", targetProfileId)
            }
        }
    }

    suspend fun unfollowProfile(currentUserId: String, targetProfileId: String) {
        supabaseClient.postgrest.from("follows").delete {
            filter {
                eq("follower_id", currentUserId)
                eq("following_id", targetProfileId)
            }
        }
    }

    suspend fun acceptFollowRequest(currentUserId: String, requesterId: String) {
        supabaseClient.postgrest.from("follows")
            .insert(FollowInsert(followerId = requesterId, followingId = currentUserId))
        declineFollowRequest(currentUserId, requesterId)
    }

    suspend fun declineFollowRequest(currentUserId: String, requesterId: String) {
        supabaseClient.postgrest.from("follow_requests").delete {
            filter {
                eq("requester_id", requesterId)
                eq("requested_id", currentUserId)
            }
        }
    }

    suspend fun searchProfiles(query: String, excludeUserId: String? = currentUserId()): List<ProfileSearchResult> {
        val safeQuery = query.trim().replace(SEARCH_UNSAFE_CHARS, "")
        if (safeQuery.length < MIN_SEARCH_LENGTH) return emptyList()

        val usernameMatches = searchProfilesByColumn("username", safeQuery, excludeUserId)
        val nameMatches = searchProfilesByColumn("display_name", safeQuery, excludeUserId)
        return (usernameMatches + nameMatches)
            .distinctBy { it.id }
            .take(SEARCH_LIMIT)
    }

    private suspend fun countRows(table: String, column: String, value: String): Int {
        return supabaseClient.postgrest.from(table)
            .select(columns = Columns.list(column)) {
                filter { eq(column, value) }
            }
            .decodeList<JsonObject>()
            .size
    }

    private suspend fun searchProfilesByColumn(
        column: String,
        safeQuery: String,
        excludeUserId: String?,
    ): List<ProfileSearchResult> {
        return supabaseClient.postgrest.from("profiles")
            .select(columns = SEARCH_COLUMNS) {
                filter {
                    ilike(column, "%$safeQuery%")
                    excludeUserId?.let { neq("id", it) }
                }
                limit(SEARCH_LIMIT.toLong())
            }
            .decodeList<ProfileSearchRow>()
            .map { it.toSearchResult() }
    }

    companion object {
        private const val MIN_SEARCH_LENGTH = 2
        private const val SEARCH_LIMIT = 20
        private val SEARCH_UNSAFE_CHARS = Regex("[,()%*]")
        private val PROFILE_COLUMNS = Columns.list("id", "username", "display_name", "avatar_url", "bio", "is_private")
        private val SEARCH_COLUMNS = Columns.list("id", "username", "display_name", "avatar_url")
    }
}
