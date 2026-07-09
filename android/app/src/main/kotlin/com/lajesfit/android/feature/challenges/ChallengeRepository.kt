package com.lajesfit.android.feature.challenges

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.postgrest.rpc
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
private data class ChallengeRow(
    val id: String,
    @SerialName("period_start") val periodStart: String,
    @SerialName("period_end") val periodEnd: String,
    val status: String,
) {
    fun toChallenge() = Challenge(
        id = id,
        periodStart = periodStart,
        periodEnd = periodEnd,
        status = when (status) {
            "closed" -> ChallengeStatus.CLOSED
            else -> ChallengeStatus.ACTIVE
        },
    )
}

@Serializable
private data class WeightLossRow(
    @SerialName("user_id") val userId: String,
    val username: String,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("pct_loss") val pctLoss: Double,
    val rank: Int,
)

@Serializable
private data class ActivityCountRow(
    @SerialName("user_id") val userId: String,
    val username: String,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("total_activities") val totalActivities: Int,
)

@Serializable
private data class ActivityDaysRow(
    @SerialName("user_id") val userId: String,
    val username: String,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("active_days") val activeDays: Int,
)

@Serializable
private data class DistanceRow(
    @SerialName("user_id") val userId: String,
    val username: String,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("total_distance_meters") val totalDistanceMeters: Double,
)

@Serializable
private data class CaloriesRow(
    @SerialName("user_id") val userId: String,
    val username: String,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("total_calories") val totalCalories: Double,
)

@Singleton
class ChallengeRepository @Inject constructor(
    private val supabaseClient: SupabaseClient,
) {

    fun currentUserId(): String? = supabaseClient.auth.currentUserOrNull()?.id

    suspend fun ensureChallengeLifecycle(): String {
        return supabaseClient.postgrest
            .rpc("ensure_challenge_lifecycle", buildJsonObject {})
            .decodeAs<String>()
    }

    suspend fun getActiveChallenge(): Challenge? {
        return supabaseClient.postgrest.from("challenges")
            .select(columns = CHALLENGE_COLUMNS) {
                filter { eq("status", "active") }
                order("period_start", Order.DESCENDING)
            }
            .decodeList<ChallengeRow>()
            .firstOrNull()
            ?.toChallenge()
    }

    suspend fun getLastClosedChallenge(): Challenge? {
        return supabaseClient.postgrest.from("challenges")
            .select(columns = CHALLENGE_COLUMNS) {
                filter { eq("status", "closed") }
                order("period_end", Order.DESCENDING)
            }
            .decodeList<ChallengeRow>()
            .firstOrNull()
            ?.toChallenge()
    }

    suspend fun getWeightLeaderboard(challengeId: String): List<WeightLossEntry> {
        return supabaseClient.postgrest
            .rpc(
                "get_challenge_leaderboard",
                buildJsonObject { put("p_challenge_id", challengeId) },
            )
            .decodeList<WeightLossRow>()
            .map { row ->
                WeightLossEntry(
                    userId = row.userId,
                    username = row.username,
                    displayName = row.displayName ?: row.username,
                    avatarUrl = row.avatarUrl,
                    rank = row.rank,
                    pctLoss = row.pctLoss,
                )
            }
    }

    suspend fun getActivityCountLeaderboard(limit: Int = DEFAULT_LIMIT): List<ActivityCountEntry> {
        return supabaseClient.postgrest
            .rpc("get_activity_count_leaderboard", limitParam(limit))
            .decodeList<ActivityCountRow>()
            .mapIndexed { index, row ->
                ActivityCountEntry(
                    userId = row.userId,
                    username = row.username,
                    displayName = row.displayName ?: row.username,
                    avatarUrl = row.avatarUrl,
                    rank = index + 1,
                    activities = row.totalActivities,
                )
            }
    }

    suspend fun getWorkoutDaysLeaderboard(limit: Int = DEFAULT_LIMIT): List<ActivityDaysEntry> {
        return supabaseClient.postgrest
            .rpc("get_workout_days_leaderboard", limitParam(limit))
            .decodeList<ActivityDaysRow>()
            .mapIndexed { index, row ->
                ActivityDaysEntry(
                    userId = row.userId,
                    username = row.username,
                    displayName = row.displayName ?: row.username,
                    avatarUrl = row.avatarUrl,
                    rank = index + 1,
                    activeDays = row.activeDays,
                )
            }
    }

    suspend fun getDistanceLeaderboard(limit: Int = DEFAULT_LIMIT): List<DistanceEntry> {
        return supabaseClient.postgrest
            .rpc("get_distance_leaderboard", limitParam(limit))
            .decodeList<DistanceRow>()
            .mapIndexed { index, row ->
                DistanceEntry(
                    userId = row.userId,
                    username = row.username,
                    displayName = row.displayName ?: row.username,
                    avatarUrl = row.avatarUrl,
                    rank = index + 1,
                    distanceMeters = row.totalDistanceMeters,
                )
            }
    }

    suspend fun getCaloriesLeaderboard(limit: Int = DEFAULT_LIMIT): List<CaloriesEntry> {
        return supabaseClient.postgrest
            .rpc("get_calories_leaderboard", limitParam(limit))
            .decodeList<CaloriesRow>()
            .mapIndexed { index, row ->
                CaloriesEntry(
                    userId = row.userId,
                    username = row.username,
                    displayName = row.displayName ?: row.username,
                    avatarUrl = row.avatarUrl,
                    rank = index + 1,
                    calories = row.totalCalories,
                )
            }
    }

    suspend fun getDietDaysLeaderboard(limit: Int = DEFAULT_LIMIT): List<ActivityDaysEntry> {
        return supabaseClient.postgrest
            .rpc("get_diet_days_leaderboard", limitParam(limit))
            .decodeList<ActivityDaysRow>()
            .mapIndexed { index, row ->
                ActivityDaysEntry(
                    userId = row.userId,
                    username = row.username,
                    displayName = row.displayName ?: row.username,
                    avatarUrl = row.avatarUrl,
                    rank = index + 1,
                    activeDays = row.activeDays,
                )
            }
    }

    private fun limitParam(limit: Int) = buildJsonObject {
        put("p_limit", limit)
    }

    companion object {
        const val DEFAULT_LIMIT = 100
        private val CHALLENGE_COLUMNS = Columns.list("id", "period_start", "period_end", "status")
    }
}
