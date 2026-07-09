package com.lajesfit.android.feature.workouts

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.exception.PostgrestRestException
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.storage.storage
import java.time.Instant
import java.util.Locale
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.roundToInt
import kotlin.time.Duration.Companion.seconds

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

@Serializable
private data class WorkoutInsert(
    @SerialName("user_id") val userId: String,
    @SerialName("activity_type") val activityType: String,
    val title: String? = null,
    @SerialName("distance_meters") val distanceMeters: Double? = null,
    @SerialName("duration_seconds") val durationSeconds: Int? = null,
    val calories: Int? = null,
    @SerialName("performed_at") val performedAt: String,
    @SerialName("media_url") val mediaUrl: String? = null,
)

@Serializable
private data class WorkoutUpdate(
    @SerialName("activity_type") val activityType: String,
    val title: String? = null,
    @SerialName("distance_meters") val distanceMeters: Double? = null,
    @SerialName("duration_seconds") val durationSeconds: Int? = null,
    val calories: Int? = null,
    @SerialName("performed_at") val performedAt: String,
    @SerialName("media_url") val mediaUrl: String? = null,
)

@Serializable
private data class WorkoutPostInsert(
    @SerialName("user_id") val userId: String,
    val content: String,
    @SerialName("media_url") val mediaUrl: String? = null,
    @SerialName("workout_id") val workoutId: String,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
private data class WorkoutPostUpdate(
    val content: String,
    @SerialName("media_url") val mediaUrl: String? = null,
    @SerialName("created_at") val createdAt: String,
)

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

    suspend fun getWorkout(id: String): LocalWorkout? {
        val userId = supabaseClient.auth.currentUserOrNull()?.id ?: return null
        val rows = try {
            fetchWorkoutRows(userId, WORKOUT_COLUMNS)
        } catch (e: PostgrestRestException) {
            fetchWorkoutRows(userId, WORKOUT_COLUMNS_WITHOUT_HEALTH_CONNECT)
        }
        return rows.firstOrNull { it.id == id }?.toLocalWorkout()
    }

    suspend fun addWorkout(input: WorkoutInput, photoBytes: ByteArray? = null): LocalWorkout {
        val userId = supabaseClient.auth.currentUserOrNull()?.id ?: throw WorkoutException("Sem sessao ativa")
        val mediaUrl = photoBytes?.let { uploadWorkoutPhoto(userId, input.activityType, it) } ?: input.mediaUrl
        val row = supabaseClient.postgrest.from("workouts")
            .insert(
                WorkoutInsert(
                    userId = userId,
                    activityType = input.activityType,
                    title = input.title,
                    distanceMeters = input.distanceMeters,
                    durationSeconds = input.durationSeconds,
                    calories = input.calories?.roundToInt(),
                    performedAt = input.performedAt,
                    mediaUrl = mediaUrl,
                ),
            ) {
                select(columns = WORKOUT_COLUMNS_WITHOUT_HEALTH_CONNECT)
            }
            .decodeSingle<WorkoutRow>()

        insertWorkoutPost(userId = userId, workout = row)
        return row.toLocalWorkout()
    }

    suspend fun updateWorkout(id: String, input: WorkoutInput, photoBytes: ByteArray? = null): LocalWorkout {
        val userId = supabaseClient.auth.currentUserOrNull()?.id ?: throw WorkoutException("Sem sessao ativa")
        val mediaUrl = photoBytes?.let { uploadWorkoutPhoto(userId, input.activityType, it) } ?: input.mediaUrl
        val row = supabaseClient.postgrest.from("workouts")
            .update(
                WorkoutUpdate(
                    activityType = input.activityType,
                    title = input.title,
                    distanceMeters = input.distanceMeters,
                    durationSeconds = input.durationSeconds,
                    calories = input.calories?.roundToInt(),
                    performedAt = input.performedAt,
                    mediaUrl = mediaUrl,
                ),
            ) {
                filter {
                    eq("id", id)
                    eq("user_id", userId)
                }
                select(columns = WORKOUT_COLUMNS_WITHOUT_HEALTH_CONNECT)
            }
            .decodeSingle<WorkoutRow>()

        updateWorkoutPost(id, row)
        return row.toLocalWorkout()
    }

    suspend fun removeWorkout(id: String) {
        val userId = supabaseClient.auth.currentUserOrNull()?.id ?: return
        supabaseClient.postgrest.from("workouts").delete {
            filter {
                eq("id", id)
                eq("user_id", userId)
            }
        }
    }

    private suspend fun fetchWorkoutRows(userId: String, columns: Columns): List<WorkoutRow> {
        return supabaseClient.postgrest.from("workouts")
            .select(columns = columns) {
                filter { eq("user_id", userId) }
                order("performed_at", Order.DESCENDING)
            }
            .decodeList<WorkoutRow>()
    }

    private suspend fun uploadWorkoutPhoto(userId: String, activityType: String, photoBytes: ByteArray): String {
        val safeName = activityType.lowercase(Locale.ROOT)
            .replace(Regex("[^a-z0-9]+"), "-")
            .trim('-')
            .ifBlank { "treino" }
        val path = "$userId/workouts/${Instant.now().toEpochMilli()}-$safeName.jpg"
        val bucket = supabaseClient.storage.from("media")
        bucket.upload(path, photoBytes) {
            upsert = true
        }
        return bucket.createSignedUrl(path, WORKOUT_PHOTO_SIGNED_URL_DURATION)
    }

    private suspend fun insertWorkoutPost(userId: String, workout: WorkoutRow) {
        supabaseClient.postgrest.from("posts").insert(
            WorkoutPostInsert(
                userId = userId,
                content = workout.title ?: workout.activityType,
                mediaUrl = workout.mediaUrl,
                workoutId = workout.id,
                createdAt = workout.performedAt,
            ),
        )
    }

    private suspend fun updateWorkoutPost(workoutId: String, workout: WorkoutRow) {
        supabaseClient.postgrest.from("posts").update(
            WorkoutPostUpdate(
                content = workout.title ?: workout.activityType,
                mediaUrl = workout.mediaUrl,
                createdAt = workout.performedAt,
            ),
        ) {
            filter { eq("workout_id", workoutId) }
        }
    }

    companion object {
        private val WORKOUT_PHOTO_SIGNED_URL_DURATION = (60 * 60 * 24 * 365 * 5).seconds
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

class WorkoutException(message: String) : Exception(message)
