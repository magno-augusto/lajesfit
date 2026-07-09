package com.lajesfit.android.feature.profile

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
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

    private suspend fun countRows(table: String, column: String, value: String): Int {
        return supabaseClient.postgrest.from(table)
            .select(columns = Columns.list(column)) {
                filter { eq(column, value) }
            }
            .decodeList<JsonObject>()
            .size
    }

    companion object {
        private val PROFILE_COLUMNS = Columns.list("id", "username", "display_name", "avatar_url", "bio", "is_private")
    }
}
