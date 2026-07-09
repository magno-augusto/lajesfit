package com.lajesfit.android.feature.diet

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil3.compose.AsyncImage
import com.lajesfit.android.ui.theme.LajesFitTheme
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

@Composable
fun DietScreen(
    onAddMeal: (MealType, LocalDate) -> Unit,
    viewModel: DietViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    DietScreenContent(
        uiState = uiState,
        onPreviousDay = viewModel::previousDay,
        onNextDay = viewModel::nextDay,
        onAddMeal = onAddMeal,
    )
}

@Composable
private fun DietScreenContent(
    uiState: DietUiState,
    onPreviousDay: () -> Unit,
    onNextDay: () -> Unit,
    onAddMeal: (MealType, LocalDate) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            DateStepper(
                selectedDate = uiState.selectedDate,
                onPreviousDay = onPreviousDay,
                onNextDay = onNextDay,
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            )
        }
        item {
            CalorieSummary(
                goal = uiState.calorieGoal,
                consumed = uiState.consumed,
                burned = uiState.burned,
                remaining = uiState.remaining,
                percent = uiState.percent,
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
            MealType.entries.forEach { mealType ->
                item {
                    MealSectionHeader(mealType = mealType, onClick = { onAddMeal(mealType, uiState.selectedDate) })
                }
                val sectionMeals = uiState.dayMeals.filter { it.meal == mealType }
                if (sectionMeals.isEmpty()) {
                    item {
                        Text(
                            text = "Nenhuma refeicao registrada",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(bottom = 8.dp),
                        )
                    }
                } else {
                    items(sectionMeals, key = { meal -> meal.dietMealId ?: "${meal.meal.value}-${meal.consumedAt}" }) { meal ->
                        MealCard(meal = meal, modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        }
    }
}

@Composable
private fun DateStepper(
    selectedDate: LocalDate,
    onPreviousDay: () -> Unit,
    onNextDay: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        IconButton(onClick = onPreviousDay) {
            Icon(Icons.Filled.ChevronLeft, contentDescription = "Dia anterior")
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Dieta", style = MaterialTheme.typography.titleLarge)
            Text(selectedDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
        }
        IconButton(onClick = onNextDay) {
            Icon(Icons.Filled.ChevronRight, contentDescription = "Proximo dia")
        }
    }
}

@Composable
private fun CalorieSummary(
    goal: Int?,
    consumed: Int,
    burned: Int,
    remaining: Int,
    percent: Float,
    modifier: Modifier = Modifier,
) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Restante", style = MaterialTheme.typography.titleMedium)
                Text("$remaining kcal", style = MaterialTheme.typography.titleMedium)
            }
            LinearProgressIndicator(
                progress = { percent / 100f },
                modifier = Modifier.fillMaxWidth(),
            )
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Meta ${goal ?: 0}")
                Text("Consumido $consumed")
                Text("Queimado $burned")
            }
        }
    }
}

@Composable
private fun MealSectionHeader(mealType: MealType, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(top = 8.dp, bottom = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = mealType.label, style = MaterialTheme.typography.titleMedium)
        Text("Adicionar", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
private fun MealCard(meal: LocalMeal, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            meal.photoUrl?.let { photoUrl ->
                AsyncImage(
                    model = photoUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(mealTimeLabel(meal.consumedAt), style = MaterialTheme.typography.titleSmall)
                Text("${meal.items.sumOf { it.kcal }.roundToInt()} kcal")
            }
            meal.items.forEachIndexed { index, item ->
                if (index > 0) HorizontalDivider()
                Column {
                    Text(item.foodName)
                    Text(
                        text = "${formatNumber(item.grams)}g - ${item.kcal.roundToInt()} kcal - " +
                            "${formatNumber(item.proteinG)}P / ${formatNumber(item.carbsG)}C / ${formatNumber(item.fatG)}G",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

private fun mealTimeLabel(consumedAt: String): String {
    return runCatching {
        DateTimeFormatter.ofPattern("HH:mm").format(Instant.parse(consumedAt).atZone(ZoneId.systemDefault()))
    }.getOrDefault("")
}

private fun formatNumber(value: Double): String {
    return if (value % 1.0 == 0.0) value.roundToInt().toString() else "%.1f".format(value)
}

@Preview(showBackground = true)
@Composable
private fun DietScreenPreview() {
    LajesFitTheme {
        DietScreenContent(
            uiState = DietUiState(
                selectedDate = LocalDate.of(2026, 7, 8),
                meals = listOf(
                    LocalMeal(
                        dietMealId = "meal-1",
                        meal = MealType.LUNCH,
                        photoUrl = null,
                        consumedAt = "2026-07-08T12:30:00Z",
                        items = listOf(
                            LocalMealItem("Arroz", 100.0, 130.0, 2.5, 28.0, 0.3),
                            LocalMealItem("Frango", 150.0, 240.0, 45.0, 0.0, 5.0),
                        ),
                    ),
                ),
                calorieGoal = 2200,
                isLoading = false,
            ),
            onPreviousDay = {},
            onNextDay = {},
            onAddMeal = { _, _ -> },
        )
    }
}
