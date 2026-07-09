package com.lajesfit.android.feature.challenges

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Straighten
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil3.compose.AsyncImage
import com.lajesfit.android.ui.theme.LajesFitTheme
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

private const val MAX_VISIBLE_RANKING_ENTRIES = 10

@Composable
fun ChallengesScreen(
    viewModel: ChallengesViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    ChallengesScreenContent(
        uiState = uiState,
        onRefresh = viewModel::refresh,
    )
}

@Composable
private fun ChallengesScreenContent(
    uiState: ChallengesUiState,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            ChallengeHeader(
                challenge = uiState.activeChallenge,
                isLoading = uiState.isLoading,
                onRefresh = onRefresh,
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
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
            return@LazyColumn
        }

        uiState.lifecycleErrorMessage?.let { message ->
            item { StatusCard(message = message, isError = true) }
        }
        uiState.errorMessage?.let { message ->
            item { StatusCard(message = message, isError = true) }
        }

        item {
            RankingCard(
                board = ChallengeBoard.ACTIVITIES,
                icon = Icons.Filled.FitnessCenter,
                entries = uiState.activityCount,
                currentUserId = uiState.currentUserId,
                failed = ChallengeBoard.ACTIVITIES in uiState.failedBoards,
                valueText = { entry ->
                    "${entry.activities} treino${if (entry.activities == 1) "" else "s"}"
                },
            )
        }
        item {
            RankingCard(
                board = ChallengeBoard.WORKOUT_DAYS,
                icon = Icons.Filled.CalendarMonth,
                entries = uiState.workoutDays,
                currentUserId = uiState.currentUserId,
                failed = ChallengeBoard.WORKOUT_DAYS in uiState.failedBoards,
                valueText = { entry ->
                    "${entry.activeDays} dia${if (entry.activeDays == 1) "" else "s"}"
                },
            )
        }
        item {
            RankingCard(
                board = ChallengeBoard.DISTANCE,
                icon = Icons.Filled.Straighten,
                entries = uiState.distance,
                currentUserId = uiState.currentUserId,
                failed = ChallengeBoard.DISTANCE in uiState.failedBoards,
                valueText = { entry -> formatDistance(entry.distanceMeters) },
            )
        }
        item {
            RankingCard(
                board = ChallengeBoard.CALORIES,
                icon = Icons.Filled.LocalFireDepartment,
                entries = uiState.caloriesBurned,
                currentUserId = uiState.currentUserId,
                failed = ChallengeBoard.CALORIES in uiState.failedBoards,
                valueText = { entry -> "${entry.calories.roundToInt().toLocaleString()} kcal" },
            )
        }
        item {
            RankingCard(
                board = ChallengeBoard.WEIGHT_LOSS,
                icon = Icons.Filled.EmojiEvents,
                entries = uiState.weightLoss,
                currentUserId = uiState.currentUserId,
                failed = ChallengeBoard.WEIGHT_LOSS in uiState.failedBoards,
                valueText = { entry -> formatWeightLoss(entry.pctLoss) },
            )
        }
        item {
            RankingCard(
                board = ChallengeBoard.DIET_DAYS,
                icon = Icons.Filled.Restaurant,
                entries = uiState.dietDays,
                currentUserId = uiState.currentUserId,
                failed = ChallengeBoard.DIET_DAYS in uiState.failedBoards,
                valueText = { entry ->
                    "${entry.activeDays} dia${if (entry.activeDays == 1) "" else "s"}"
                },
            )
        }

        if (uiState.previousTopThree.isNotEmpty()) {
            item {
                PreviousPodiumCard(
                    entries = uiState.previousTopThree,
                    currentUserId = uiState.currentUserId,
                    modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                )
            }
        } else {
            item { Box(modifier = Modifier.padding(bottom = 4.dp)) }
        }
    }
}

@Composable
private fun ChallengeHeader(
    challenge: Challenge?,
    isLoading: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.EmojiEvents,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(36.dp),
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text("Desafios do mes", style = MaterialTheme.typography.headlineSmall)
                    Text(
                        text = challenge?.let { formatChallengePeriod(it) }
                            ?: if (isLoading) "Carregando rankings..." else "Rankings do mes atual",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                TextButton(onClick = onRefresh, enabled = !isLoading) {
                    Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                    Text("Atualizar")
                }
            }
            Text(
                text = "Registre treinos e refeicoes para subir nos rankings.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun StatusCard(message: String, isError: Boolean, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Text(
            text = message,
            color = if (isError) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(14.dp),
        )
    }
}

@Composable
private fun <T> RankingCard(
    board: ChallengeBoard,
    icon: ImageVector,
    entries: List<T>,
    currentUserId: String?,
    failed: Boolean,
    valueText: (T) -> String,
    modifier: Modifier = Modifier,
) where T : ChallengeRankedEntry {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(board.title, style = MaterialTheme.typography.titleMedium)
                    Text(
                        board.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            when {
                failed && entries.isEmpty() -> {
                    Text("Nao foi possivel carregar este ranking.", color = MaterialTheme.colorScheme.error)
                }
                entries.isEmpty() -> {
                    Text(
                        text = board.emptyMessage,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                else -> {
                    visibleEntries(entries, currentUserId).forEachIndexed { index, entry ->
                        if (index > 0) HorizontalDivider()
                        RankingRow(
                            entry = entry,
                            value = valueText(entry),
                            isMe = entry.userId == currentUserId,
                        )
                    }
                    if (entries.size > MAX_VISIBLE_RANKING_ENTRIES) {
                        Text(
                            text = "Mostrando ${visibleEntries(entries, currentUserId).size} de ${entries.size}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.align(Alignment.End),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RankingRow(
    entry: ChallengeRankedEntry,
    value: String,
    isMe: Boolean,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = entry.rank.toString(),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.size(28.dp),
        )
        ChallengeAvatar(avatarUrl = entry.avatarUrl, fallbackName = entry.displayName)
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = entry.displayName + if (isMe) " (voce)" else "",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (isMe) FontWeight.SemiBold else FontWeight.Normal,
            )
            Text(
                text = "@${entry.username}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        AssistChip(onClick = {}, label = { Text(value) })
    }
}

@Composable
private fun ChallengeAvatar(avatarUrl: String?, fallbackName: String, modifier: Modifier = Modifier) {
    if (avatarUrl != null) {
        AsyncImage(
            model = avatarUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = modifier.size(40.dp).clip(CircleShape),
        )
    } else {
        Box(
            modifier = modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Text(fallbackName.take(1).uppercase(), textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun PreviousPodiumCard(
    entries: List<WeightLossEntry>,
    currentUserId: String?,
    modifier: Modifier = Modifier,
) {
    RankingCard(
        board = ChallengeBoard.WEIGHT_LOSS,
        icon = Icons.Filled.EmojiEvents,
        entries = entries,
        currentUserId = currentUserId,
        failed = false,
        valueText = { entry -> formatWeightLoss(entry.pctLoss) },
        modifier = modifier,
    )
}

private fun <T> visibleEntries(entries: List<T>, currentUserId: String?): List<T> where T : ChallengeRankedEntry {
    val top = entries.take(MAX_VISIBLE_RANKING_ENTRIES)
    val current = currentUserId?.let { id -> entries.firstOrNull { it.userId == id } }
    return if (current != null && top.none { it.userId == current.userId }) top + current else top
}

private fun formatChallengePeriod(challenge: Challenge): String {
    return runCatching {
        val start = LocalDate.parse(challenge.periodStart)
        val end = LocalDate.parse(challenge.periodEnd)
        val month = start.format(DateTimeFormatter.ofPattern("MMMM", PT_BR)).replaceFirstChar { it.uppercase() }
        "$month - ${start.format(DAY_MONTH_FORMAT)} a ${end.format(DAY_MONTH_FORMAT)}"
    }.getOrDefault("Rankings do mes atual")
}

private fun formatDistance(meters: Double): String {
    return String.format(PT_BR, "%.1f km", meters / 1000.0)
}

private fun formatWeightLoss(pctLoss: Double): String {
    val prefix = if (pctLoss > 0) "-" else ""
    return prefix + String.format(PT_BR, "%.1f%%", abs(pctLoss))
}

private fun Int.toLocaleString(): String = String.format(PT_BR, "%,d", this)

private val PT_BR = Locale.forLanguageTag("pt-BR")
private val DAY_MONTH_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM", PT_BR)

@Preview(showBackground = true)
@Composable
private fun ChallengesScreenPreview() {
    LajesFitTheme {
        ChallengesScreenContent(
            uiState = ChallengesUiState(
                currentUserId = "u2",
                activeChallenge = Challenge(
                    id = "challenge-1",
                    periodStart = "2026-07-01",
                    periodEnd = "2026-07-31",
                    status = ChallengeStatus.ACTIVE,
                ),
                activityCount = listOf(
                    ActivityCountEntry("u1", "bia_fit", "Bia Fit", null, 1, 18),
                    ActivityCountEntry("u2", "magno", "Magno", null, 2, 15),
                ),
                workoutDays = listOf(
                    ActivityDaysEntry("u3", "ana", "Ana", null, 1, 12),
                    ActivityDaysEntry("u2", "magno", "Magno", null, 2, 10),
                ),
                distance = listOf(
                    DistanceEntry("u1", "bia_fit", "Bia Fit", null, 1, 42300.0),
                ),
                caloriesBurned = listOf(
                    CaloriesEntry("u2", "magno", "Magno", null, 1, 5140.0),
                ),
                weightLoss = listOf(
                    WeightLossEntry("u4", "leo", "Leo", null, 1, 4.2),
                    WeightLossEntry("u2", "magno", "Magno", null, 2, 3.1),
                ),
                dietDays = listOf(
                    ActivityDaysEntry("u2", "magno", "Magno", null, 1, 20),
                ),
                isLoading = false,
            ),
            onRefresh = {},
        )
    }
}
