package com.lajesfit.android.feature.settings

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.storage.storage
import java.time.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.time.Duration.Companion.seconds

@Serializable
private data class ProfileSettingsRow(
    val username: String,
    @SerialName("display_name") val displayName: String? = null,
    val bio: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("recovery_email") val recoveryEmail: String? = null,
    @SerialName("is_admin") val isAdmin: Boolean = false,
    @SerialName("is_private") val isPrivate: Boolean = false,
    @SerialName("notifications_enabled") val notificationsEnabled: Boolean = true,
    @SerialName("notify_likes") val notifyLikes: Boolean = true,
    @SerialName("notify_comments") val notifyComments: Boolean = true,
    @SerialName("notify_follows") val notifyFollows: Boolean = true,
    @SerialName("notify_challenges") val notifyChallenges: Boolean = true,
) {
    fun toSettings() = ProfileSettings(
        username = username,
        displayName = displayName ?: username,
        bio = bio,
        avatarUrl = avatarUrl,
        recoveryEmail = recoveryEmail,
        isAdmin = isAdmin,
        isPrivate = isPrivate,
        notificationsEnabled = notificationsEnabled,
        notifyLikes = notifyLikes,
        notifyComments = notifyComments,
        notifyFollows = notifyFollows,
        notifyChallenges = notifyChallenges,
    )
}

@Serializable
private data class ProfileSettingsUpdate(
    @SerialName("display_name") val displayName: String,
    val bio: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
)

@Serializable
private data class PrivacyUpdate(@SerialName("is_private") val isPrivate: Boolean)

@Serializable
private data class AvatarUpdate(@SerialName("avatar_url") val avatarUrl: String?)

@Singleton
class SettingsRepository @Inject constructor(
    private val supabaseClient: SupabaseClient,
) {

    fun currentUserId(): String? = supabaseClient.auth.currentUserOrNull()?.id

    suspend fun getProfileSettings(): ProfileSettings? {
        val userId = currentUserId() ?: return null
        return supabaseClient.postgrest.from("profiles")
            .select(columns = SETTINGS_COLUMNS) {
                filter { eq("id", userId) }
            }
            .decodeSingleOrNull<ProfileSettingsRow>()
            ?.toSettings()
    }

    suspend fun updateProfileSettings(displayName: String, bio: String?, avatarUrl: String?) {
        val userId = currentUserId() ?: throw SettingsException("Sem sessao ativa")
        supabaseClient.postgrest.from("profiles")
            .update(ProfileSettingsUpdate(displayName = displayName, bio = bio, avatarUrl = avatarUrl)) {
                filter { eq("id", userId) }
            }
    }

    suspend fun updateProfilePrivacy(isPrivate: Boolean) {
        val userId = currentUserId() ?: throw SettingsException("Sem sessao ativa")
        supabaseClient.postgrest.from("profiles")
            .update(PrivacyUpdate(isPrivate = isPrivate)) {
                filter { eq("id", userId) }
            }
    }

    suspend fun uploadAvatar(photoBytes: ByteArray): String {
        val userId = currentUserId() ?: throw SettingsException("Sem sessao ativa")
        val path = "$userId/avatar-${Instant.now().toEpochMilli()}.jpg"
        val bucket = supabaseClient.storage.from("media")
        bucket.upload(path, photoBytes) {
            upsert = true
        }
        val url = bucket.createSignedUrl(path, AVATAR_SIGNED_URL_DURATION)
        supabaseClient.postgrest.from("profiles")
            .update(AvatarUpdate(avatarUrl = url)) {
                filter { eq("id", userId) }
            }
        return url
    }

    companion object {
        private val AVATAR_SIGNED_URL_DURATION = (60 * 60 * 24 * 365 * 5).seconds
        private val SETTINGS_COLUMNS = Columns.list(
            "username",
            "display_name",
            "bio",
            "avatar_url",
            "recovery_email",
            "is_admin",
            "is_private",
            "notifications_enabled",
            "notify_likes",
            "notify_comments",
            "notify_follows",
            "notify_challenges",
        )
    }
}

class SettingsException(message: String) : Exception(message)
