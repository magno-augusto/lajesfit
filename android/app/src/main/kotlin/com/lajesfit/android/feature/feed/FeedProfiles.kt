package com.lajesfit.android.feature.feed

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class ProfileRow(
    val id: String,
    val username: String,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
) {
    fun toSummary() = ProfileSummary(id = id, username = username, displayName = displayName, avatarUrl = avatarUrl)
}

/** Compartilhado entre FeedRepository e CommentsRepository - ambos hidratam profiles do mesmo jeito. */
internal suspend fun fetchProfileSummaries(
    supabaseClient: SupabaseClient,
    userIds: List<String>,
): Map<String, ProfileSummary> {
    if (userIds.isEmpty()) return emptyMap()
    return supabaseClient.postgrest.from("profiles")
        .select(columns = Columns.list("id", "username", "display_name", "avatar_url")) {
            filter { isIn("id", userIds) }
        }
        .decodeList<ProfileRow>()
        .associate { it.id to it.toSummary() }
}
