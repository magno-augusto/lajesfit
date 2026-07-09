package com.lajesfit.android.feature.workouts

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.exception.PostgrestRestException
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
private data class WorkoutRow(
    val id: String,
    @SerialName("activity_type") val activityType: String,
    val title: String? = null,
    @SerialName("distance_meters") val distanceMeters: Double? = null,
    @SerialName("duration_seconds") val durationSeconds: Int? = null,
    val calories: Double? = null,
    @SerialName("performed_at") val performedAt: String,
    @SerialName("media_url") val mediaUrl: String? = null,
    val source: String? = null,
    @SerialName("strava_activity_id") val stravaActivityId: Long? = null,
    @SerialName("health_connect_record_id") val healthConnectRecordId: String? = null,
) {
    fun toLocalWorkout() = LocalWorkout(
        id = id,
        activityType = activityType,
        title = title,
        distanceMeters = distanceMeters,
        durationSeconds = durationSeconds,
        calories = calories,
        performedAt = performedAt,
        mediaUrl = mediaUrl,
        source = source ?: "manual",
        stravaActivityId = stravaActivityId,
        healthConnectRecordId = healthConnectRecordId,
    )
}

/** Porta workouts-api.ts para Kotlin - ver android/specs/M5-treinos.md. */
@Singleton
class WorkoutRepository @Inject constructor(
    private val supabaseClient: SupabaseClient,
) {

    suspend fun getWorkouts(): List<LocalWorkout> {
        val userId = supabaseClient.auth.currentUserOrNull()?.id ?: return emptyList()
        val rows = try {
            fetchWorkoutRows(userId, WORKOUT_COLUMNS)
        } catch (e: PostgrestRestException) {
            fetchWorkoutRows(userId, WORKOUT_COLUMNS_WITHOUT_HEALTH_CONNECT)
        }
        return rows.map { it.toLocalWorkout() }
    }

    private suspend fun fetchWorkoutRows(userId: String, columns: Columns): List<WorkoutRow> {
        return supabaseClient.postgrest.from("workouts")
            .select(columns = columns) {
                filter { eq("user_id", userId) }
                order("performed_at", Order.DESCENDING)
            }
            .decodeList<WorkoutRow>()
    }

    companion object {
        private val WORKOUT_COLUMNS = Columns.list(
            "id",
            "activity_type",
            "title",
            "distance_meters",
            "duration_seconds",
            "calories",
            "performed_at",
            "media_url",
            "source",
            "strava_activity_id",
            "health_connect_record_id",
        )
        private val WORKOUT_COLUMNS_WITHOUT_HEALTH_CONNECT = Columns.list(
            "id",
            "activity_type",
            "title",
            "distance_meters",
            "duration_seconds",
            "calories",
            "performed_at",
            "media_url",
            "source",
            "strava_activity_id",
        )
    }
}
