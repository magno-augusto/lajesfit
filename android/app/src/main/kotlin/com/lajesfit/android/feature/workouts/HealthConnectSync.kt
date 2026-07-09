package com.lajesfit.android.feature.workouts

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import dagger.hilt.android.qualifiers.ApplicationContext
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

    companion object {
        const val HEALTH_CONNECT_PROVIDER_PACKAGE = "com.google.android.apps.healthdata"
    }
}
