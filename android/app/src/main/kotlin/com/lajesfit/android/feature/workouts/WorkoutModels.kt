package com.lajesfit.android.feature.workouts

enum class WorkoutActivityType(val label: String, val hasDistance: Boolean = true) {
    RUN("Corrida"),
    WALK("Caminhada"),
    BIKE("Ciclismo"),
    STRENGTH("Musculacao", hasDistance = false),
    HIKE("Trilha"),
    SWIM("Natacao"),
    OTHER("Outro"),
}

data class LocalWorkout(
    val id: String,
    val activityType: String,
    val title: String?,
    val distanceMeters: Double?,
    val durationSeconds: Int?,
    val calories: Double?,
    val performedAt: String,
    val mediaUrl: String?,
    val source: String,
    val stravaActivityId: Long?,
    val healthConnectRecordId: String?,
)

data class WorkoutInput(
    val activityType: String,
    val title: String?,
    val distanceMeters: Double?,
    val durationSeconds: Int?,
    val calories: Double?,
    val performedAt: String,
    val mediaUrl: String?,
)

data class HealthConnectWorkoutInput(
    val healthConnectRecordId: String,
    val activityType: String,
    val title: String,
    val distanceMeters: Double?,
    val durationSeconds: Int?,
    val calories: Double?,
    val performedAt: String,
)

data class HealthConnectSyncResult(
    val imported: Int,
    val updated: Int,
)
