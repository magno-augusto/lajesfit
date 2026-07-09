package com.lajesfit.android.feature.profile

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
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
}
