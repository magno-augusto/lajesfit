package com.lajesfit.android.feature.workouts

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import javax.inject.Inject
import javax.inject.Singleton

enum class HealthConnectStatus {
    UNAVAILABLE,
    NEEDS_INSTALL_OR_UPDATE,
    NEEDS_PERMISSION,
    READY,
}

@Singleton
class HealthConnectSync @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    val permissions: Set<String> = setOf(
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
    )

    fun permissionContract() = PermissionController.createRequestPermissionResultContract()

    suspend fun status(): HealthConnectStatus {
        return when (HealthConnectClient.getSdkStatus(context, HEALTH_CONNECT_PROVIDER_PACKAGE)) {
            HealthConnectClient.SDK_UNAVAILABLE -> HealthConnectStatus.UNAVAILABLE
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> HealthConnectStatus.NEEDS_INSTALL_OR_UPDATE
            HealthConnectClient.SDK_AVAILABLE -> {
                val granted = HealthConnectClient.getOrCreate(context)
                    .permissionController
                    .getGrantedPermissions()
                if (granted.containsAll(permissions)) HealthConnectStatus.READY else HealthConnectStatus.NEEDS_PERMISSION
            }
            else -> HealthConnectStatus.UNAVAILABLE
        }
    }

    /** Le sessoes de exercicio do mes atual e agrega distancia/calorias de cada uma. */
    suspend fun readMonthlyWorkouts(): List<HealthConnectWorkoutInput> {
        val client = HealthConnectClient.getOrCreate(context)
        val now = Instant.now()
        val startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay(ZoneId.systemDefault()).toInstant()
        val sessions = client.readRecords(
            ReadRecordsRequest(
                recordType = ExerciseSessionRecord::class,
                timeRangeFilter = TimeRangeFilter.between(startOfMonth, now),
            ),
        ).records

        return sessions.map { session ->
            val activityType = mapExerciseType(session.exerciseType)
            val (distanceMeters, calories) = aggregateSession(client, session)
            HealthConnectWorkoutInput(
                healthConnectRecordId = session.metadata.id,
                activityType = activityType,
                title = session.title?.takeIf { it.isNotBlank() } ?: activityType,
                distanceMeters = distanceMeters,
                durationSeconds = Duration.between(session.startTime, session.endTime).seconds.toInt(),
                calories = calories,
                performedAt = session.startTime.toString(),
            )
        }
    }

    private suspend fun aggregateSession(
        client: HealthConnectClient,
        session: ExerciseSessionRecord,
    ): Pair<Double?, Double?> {
        // Sessoes sem leituras de distancia/calorias no intervalo (ex.: musculacao) nao tem erro,
        // apenas retornam metricas ausentes do AggregationResult.
        val result = runCatching {
            client.aggregate(
                AggregateRequest(
                    metrics = setOf(DistanceRecord.DISTANCE_TOTAL, TotalCaloriesBurnedRecord.ENERGY_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(session.startTime, session.endTime),
                ),
            )
        }.getOrNull() ?: return null to null
        return result.get(DistanceRecord.DISTANCE_TOTAL)?.meters to result.get(TotalCaloriesBurnedRecord.ENERGY_TOTAL)?.kilocalories
    }

    private fun mapExerciseType(exerciseType: Int): String = when (exerciseType) {
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL,
        -> WorkoutActivityType.RUN.label
        ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> WorkoutActivityType.WALK.label
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING,
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY,
        -> WorkoutActivityType.BIKE.label
        ExerciseSessionRecord.EXERCISE_TYPE_HIKING -> WorkoutActivityType.HIKE.label
        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_OPEN_WATER,
        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL,
        -> WorkoutActivityType.SWIM.label
        ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
        ExerciseSessionRecord.EXERCISE_TYPE_WEIGHTLIFTING,
        ExerciseSessionRecord.EXERCISE_TYPE_CALISTHENICS,
        ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING,
        ExerciseSessionRecord.EXERCISE_TYPE_BOOT_CAMP,
        ExerciseSessionRecord.EXERCISE_TYPE_ELLIPTICAL,
        ExerciseSessionRecord.EXERCISE_TYPE_STAIR_CLIMBING,
        ExerciseSessionRecord.EXERCISE_TYPE_STAIR_CLIMBING_MACHINE,
        ExerciseSessionRecord.EXERCISE_TYPE_ROWING_MACHINE,
        -> WorkoutActivityType.STRENGTH.label
        else -> WorkoutActivityType.OTHER.label
    }

    companion object {
        const val HEALTH_CONNECT_PROVIDER_PACKAGE = "com.google.android.apps.healthdata"
    }
}
