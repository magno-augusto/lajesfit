package com.lajesfit.android.feature.workouts

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Straighten
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.health.connect.client.PermissionController
import coil3.compose.AsyncImage
import com.lajesfit.android.feature.feed.timeAgo
import com.lajesfit.android.ui.theme.LajesFitTheme
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

@Composable
fun WorkoutsScreen(
    onAddWorkout: () -> Unit,
    onEditWorkout: (String) -> Unit,
    viewModel: WorkoutsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = PermissionController.createRequestPermissionResultContract(),
    ) { grantedPermissions ->
        viewModel.onHealthPermissionsResult(grantedPermissions)
    }
    WorkoutsScreenContent(
        uiState = uiState,
        onAddWorkout = onAddWorkout,
        onEditWorkout = onEditWorkout,
        onRemoveWorkout = viewModel::removeWorkout,
        onRequestHealthPermission = { permissionLauncher.launch(viewModel.healthConnectPermissions) },
        onInstallHealthConnect = {
            context.startActivity(
                Intent(Intent.ACTION_VIEW).apply {
                    data = Uri.parse("market://details?id=${HealthConnectSync.HEALTH_CONNECT_PROVIDER_PACKAGE}")
                    setPackage("com.android.vending")
                },
            )
        },
    )
}

@Composable
private fun WorkoutsScreenContent(
    uiState: WorkoutsUiState,
    onAddWorkout: () -> Unit,
    onEditWorkout: (String) -> Unit,
    onRemoveWorkout: (String) -> Unit,
    onRequestHealthPermission: () -> Unit,
    onInstallHealthConnect: () -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(text = "Meus treinos", style = MaterialTheme.typography.headlineSmall)
                Button(onClick = onAddWorkout) {
                    Icon(Icons.Filled.Add, contentDescription = null)
                    Text("Registrar")
                }
            }
        }
        item {
            MonthTotalsCard(totals = uiState.monthTotals, modifier = Modifier.fillMaxWidth())
        }
        item {
            HealthConnectCard(
                status = uiState.healthConnectStatus,
                onRequestPermission = onRequestHealthPermission,
                onInstallHealthConnect = onInstallHealthConnect,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        if (uiState.isLoading) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                    horizontalArrangement = Arrangement.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
        } else {
            uiState.errorMessage?.let { message ->
                item { Text(message, color = MaterialTheme.colorScheme.error) }
            }
            if (uiState.workouts.isEmpty()) {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = "Nenhum treino registrado ainda",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(24.dp),
                        )
                    }
                }
            } else {
                items(uiState.workouts, key = { it.id }) { workout ->
                    WorkoutCard(
                        workout = workout,
                        onEdit = { onEditWorkout(workout.id) },
                        onRemove = { onRemoveWorkout(workout.id) },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}

@Composable
private fun HealthConnectCard(
    status: HealthConnectStatus,
    onRequestPermission: () -> Unit,
    onInstallHealthConnect: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Health Connect", style = MaterialTheme.typography.titleMedium)
            when (status) {
                HealthConnectStatus.UNAVAILABLE -> {
                    Text(
                        "Health Connect nao esta disponivel neste aparelho.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                HealthConnectStatus.NEEDS_INSTALL_OR_UPDATE -> {
                    Text(
                        "Instale ou atualize o Health Connect para importar treinos automaticamente.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Button(onClick = onInstallHealthConnect) {
                        Text("Abrir Play Store")
                    }
                }
                HealthConnectStatus.NEEDS_PERMISSION -> {
                    Text(
                        "Autorize a leitura de sessoes de exercicio para sincronizar treinos.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Button(onClick = onRequestPermission) {
                        Text("Autorizar")
                    }
                }
                HealthConnectStatus.READY -> {
                    Text(
                        "Pronto para sincronizar. A importacao entra na proxima etapa.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun MonthTotalsCard(totals: WorkoutMonthTotals, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "Este mes",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                MonthStat(icon = Icons.Filled.FitnessCenter, value = totals.count.toString(), label = "Treinos")
                MonthStat(icon = Icons.Filled.Schedule, value = formatDuration(totals.durationSeconds), label = "Tempo")
                MonthStat(icon = Icons.Filled.Straighten, value = formatDistance(totals.distanceMeters), label = "Distancia")
                MonthStat(icon = Icons.Filled.LocalFireDepartment, value = totals.calories.toString(), label = "Calorias")
            }
        }
    }
}

@Composable
private fun MonthStat(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    value: String,
    label: String,
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
        Text(text = value, style = MaterialTheme.typography.titleMedium)
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun WorkoutCard(
    workout: LocalWorkout,
    onEdit: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                if (workout.mediaUrl != null) {
                    AsyncImage(
                        model = workout.mediaUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(52.dp),
                    )
                } else {
                    Icon(
                        Icons.AutoMirrored.Filled.DirectionsRun,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(52.dp),
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = workout.title ?: workout.activityType, style = MaterialTheme.typography.titleMedium)
                    Text(
                        text = "${workout.activityType} - ${workoutDateTime(workout.performedAt)} - ${timeAgo(workout.performedAt)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = onEdit) {
                    Icon(Icons.Filled.Edit, contentDescription = "Editar treino")
                }
                IconButton(onClick = onRemove) {
                    Icon(Icons.Filled.Delete, contentDescription = "Remover treino")
                }
            }
            HorizontalDivider()
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                WorkoutStat(label = "Distancia", value = formatDistance(workout.distanceMeters))
                WorkoutStat(label = "Tempo", value = formatDuration(workout.durationSeconds ?: 0))
                WorkoutStat(label = "Calorias", value = workout.calories?.roundToInt()?.toString() ?: "-")
            }
        }
    }
}

@Composable
private fun WorkoutStat(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(text = value, style = MaterialTheme.typography.titleMedium)
    }
}

private fun formatDistance(distanceMeters: Double?): String {
    val meters = distanceMeters ?: return "-"
    return if (meters >= 1000) "%.1f km".format(meters / 1000.0) else "${meters.roundToInt()} m"
}

private fun formatDuration(seconds: Int): String {
    if (seconds <= 0) return "-"
    val hours = seconds / 3600
    val minutes = (seconds % 3600) / 60
    return when {
        hours > 0 && minutes > 0 -> "${hours}h ${minutes}min"
        hours > 0 -> "${hours}h"
        else -> "${minutes}min"
    }
}

private fun workoutDateTime(performedAt: String): String {
    return runCatching {
        val zoned = Instant.parse(performedAt).atZone(ZoneId.systemDefault())
        DateTimeFormatter.ofPattern("dd/MM 'as' HH:mm").format(zoned)
    }.getOrDefault("")
}

@Preview(showBackground = true)
@Composable
private fun WorkoutsScreenPreview() {
    LajesFitTheme {
        WorkoutsScreenContent(
            uiState = WorkoutsUiState(
                workouts = listOf(
                    LocalWorkout(
                        id = "workout-1",
                        activityType = "Corrida",
                        title = "Corrida no fim da tarde",
                        distanceMeters = 5200.0,
                        durationSeconds = 1860,
                        calories = 410.0,
                        performedAt = "2026-07-09T20:30:00Z",
                        mediaUrl = null,
                        source = "manual",
                        stravaActivityId = null,
                        healthConnectRecordId = null,
                    ),
                ),
                isLoading = false,
            ),
            onAddWorkout = {},
            onEditWorkout = {},
            onRemoveWorkout = {},
            onRequestHealthPermission = {},
            onInstallHealthConnect = {},
        )
    }
}
