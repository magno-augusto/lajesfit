package com.lajesfit.android.feature.workouts

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.health.connect.client.PermissionController
import coil3.compose.AsyncImage
import com.lajesfit.android.feature.feed.timeAgo
import com.lajesfit.android.ui.theme.BebasNeue
import com.lajesfit.android.ui.theme.LajesFitTheme
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.roundToInt

// Espelha src/features/workouts/WorkoutsPage.tsx: cabecalho "MEUS TREINOS" em
// Bebas + botao Registrar, card branco "Este mes" com badges circulares
// primary/10 e numeros em Bebas, e lista de treinos em cards brancos com stat
// de distancia/tempo/calorias. Strava (link/logo/OAuth) e o WeeklyWorkoutChart
// ficam fora de escopo Android (ver specs/M5-treinos.md).

private val PtBr = Locale("pt", "BR")

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
        onSyncHealthConnect = viewModel::syncHealthConnect,
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
    onSyncHealthConnect: () -> Unit,
    onInstallHealthConnect: () -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(text = "MEUS TREINOS", style = MaterialTheme.typography.displaySmall)
                Button(
                    onClick = onAddWorkout,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
                ) {
                    Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Registrar", style = MaterialTheme.typography.labelLarge)
                }
            }
        }
        item {
            MonthTotalsCard(totals = uiState.monthTotals, modifier = Modifier.fillMaxWidth())
        }
        item {
            HealthConnectCard(
                status = uiState.healthConnectStatus,
                isSyncing = uiState.isSyncingHealthConnect,
                syncMessage = uiState.healthConnectSyncMessage,
                onRequestPermission = onRequestHealthPermission,
                onSync = onSyncHealthConnect,
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
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Text(
                            text = "Nenhum treino registrado ainda",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(24.dp),
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

// --- Health Connect (sem equivalente no web, que usa Strava) ---

@Composable
private fun HealthConnectCard(
    status: HealthConnectStatus,
    isSyncing: Boolean,
    syncMessage: String?,
    onRequestPermission: () -> Unit,
    onSync: () -> Unit,
    onInstallHealthConnect: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Health Connect", style = MaterialTheme.typography.titleMedium)
            when (status) {
                HealthConnectStatus.UNAVAILABLE -> {
                    Text(
                        "Health Connect nao esta disponivel neste aparelho.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                HealthConnectStatus.NEEDS_INSTALL_OR_UPDATE -> {
                    Text(
                        "Instale ou atualize o Health Connect para importar treinos automaticamente.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Button(onClick = onInstallHealthConnect) {
                        Text("Abrir Play Store")
                    }
                }
                HealthConnectStatus.NEEDS_PERMISSION -> {
                    Text(
                        "Autorize a leitura de sessoes de exercicio para sincronizar treinos.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Button(onClick = onRequestPermission) {
                        Text("Autorizar")
                    }
                }
                HealthConnectStatus.READY -> {
                    Text(
                        text = when {
                            isSyncing -> "Sincronizando sessoes do mes..."
                            syncMessage != null -> syncMessage
                            else -> "Importa as sessoes de exercicio do mes atual do Health Connect."
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Button(onClick = onSync, enabled = !isSyncing) {
                        Text(if (isSyncing) "Sincronizando..." else "Sincronizar")
                    }
                }
            }
        }
    }
}

// --- Resumo do mes (web: 4 MonthStat com icone circular bg-primary/10) ---

@Composable
private fun MonthTotalsCard(totals: WorkoutMonthTotals, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "Este mes".uppercase(PtBr),
                style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 1.sp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                MonthStat(
                    icon = Icons.Filled.FitnessCenter,
                    value = totals.count.toString(),
                    label = "Treinos",
                    modifier = Modifier.weight(1f),
                )
                MonthStat(
                    icon = Icons.Filled.Schedule,
                    value = formatDuration(totals.durationSeconds),
                    label = "Tempo",
                    modifier = Modifier.weight(1f),
                )
                MonthStat(
                    icon = Icons.Filled.Straighten,
                    value = formatDistance(totals.distanceMeters),
                    label = "Distancia",
                    modifier = Modifier.weight(1f),
                )
                MonthStat(
                    icon = Icons.Filled.LocalFireDepartment,
                    value = totals.calories.toString(),
                    label = "Calorias",
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun MonthStat(
    icon: ImageVector,
    value: String,
    label: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(14.dp))
        }
        Text(text = value, fontFamily = BebasNeue, fontSize = 20.sp, lineHeight = 20.sp)
        Text(
            text = label,
            fontSize = 11.sp,
            lineHeight = 11.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

// --- Historico (web: card branco por treino, foto/badge + 3 colunas de stat) ---

@Composable
private fun WorkoutCard(
    workout: LocalWorkout,
    onEdit: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                if (workout.mediaUrl != null) {
                    AsyncImage(
                        model = workout.mediaUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(52.dp).clip(RoundedCornerShape(14.dp)),
                    )
                } else {
                    WorkoutIconBadge()
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = workout.title ?: workout.activityType,
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = "${workout.activityType} - ${workoutDateTime(workout.performedAt)} - ${timeAgo(workout.performedAt)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                IconButton(onClick = onEdit) {
                    Icon(
                        Icons.Filled.Edit,
                        contentDescription = "Editar treino",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = onRemove) {
                    Icon(
                        Icons.Filled.Delete,
                        contentDescription = "Remover treino",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outline)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                WorkoutStat(
                    label = "Distancia",
                    value = formatDistance(workout.distanceMeters),
                    modifier = Modifier.weight(1f),
                )
                WorkoutStat(
                    label = "Tempo",
                    value = formatDuration(workout.durationSeconds ?: 0),
                    modifier = Modifier.weight(1f),
                )
                WorkoutStat(
                    label = "Calorias",
                    value = workout.calories?.roundToInt()?.toString() ?: "-",
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun WorkoutIconBadge(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(52.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            Icons.AutoMirrored.Filled.DirectionsRun,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(24.dp),
        )
    }
}

@Composable
private fun WorkoutStat(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(text = value, fontFamily = BebasNeue, fontSize = 20.sp)
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
            onSyncHealthConnect = {},
            onInstallHealthConnect = {},
        )
    }
}
