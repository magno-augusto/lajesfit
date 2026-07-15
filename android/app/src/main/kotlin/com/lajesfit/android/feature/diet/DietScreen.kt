package com.lajesfit.android.feature.diet

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Coffee
import androidx.compose.material.icons.filled.Cookie
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.SoupKitchen
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedIconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil3.compose.AsyncImage
import com.lajesfit.android.ui.theme.BebasNeue
import com.lajesfit.android.ui.theme.LajesFitTheme
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.roundToInt

// Espelha src/features/diary/DiaryPage.tsx + diet/DailySummaryCard.tsx +
// diet/CalorieRing.tsx: stepper de data compacto, card branco de resumo com
// anel de calorias e tiles de macros, e 4 secoes fixas de refeicao em cards.

private val PtBr = Locale("pt", "BR")

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
    var expandedMeals by remember { mutableStateOf(setOf<MealType>()) }

    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            DateStepper(
                selectedDate = uiState.selectedDate,
                onPreviousDay = onPreviousDay,
                onNextDay = onNextDay,
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            )
        }
        item {
            DailySummaryCard(
                consumed = uiState.consumed,
                target = uiState.calorieGoal ?: 0,
                burned = uiState.burned,
                remaining = uiState.remaining,
                percent = uiState.percent,
                protein = uiState.proteinTotal,
                carbs = uiState.carbsTotal,
                fat = uiState.fatTotal,
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
                item(key = mealType.value) {
                    val sectionMeals = uiState.dayMeals.filter { it.meal == mealType }
                    MealSection(
                        mealType = mealType,
                        meals = sectionMeals,
                        expanded = expandedMeals.contains(mealType),
                        onHeaderClick = {
                            if (sectionMeals.isEmpty()) {
                                onAddMeal(mealType, uiState.selectedDate)
                            } else {
                                expandedMeals = if (expandedMeals.contains(mealType)) {
                                    expandedMeals - mealType
                                } else {
                                    expandedMeals + mealType
                                }
                            }
                        },
                        onActionClick = { onAddMeal(mealType, uiState.selectedDate) },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}

// --- Stepper de data (web: chevrons ghost + pilula central com icone de calendario) ---

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
        horizontalArrangement = Arrangement.Center,
    ) {
        IconButton(onClick = onPreviousDay, modifier = Modifier.size(28.dp)) {
            Icon(
                Icons.Filled.ChevronLeft,
                contentDescription = "Ver dia anterior",
                modifier = Modifier.size(16.dp),
            )
        }
        Row(
            modifier = Modifier.padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(
                Icons.Filled.CalendarToday,
                contentDescription = null,
                modifier = Modifier.size(12.dp),
                tint = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = formatSelectedDate(selectedDate),
                style = MaterialTheme.typography.labelMedium,
            )
        }
        IconButton(onClick = onNextDay, modifier = Modifier.size(28.dp)) {
            Icon(
                Icons.Filled.ChevronRight,
                contentDescription = "Ver dia posterior",
                modifier = Modifier.size(16.dp),
            )
        }
    }
}

private fun formatSelectedDate(date: LocalDate): String {
    val today = LocalDate.now()
    val short = DateTimeFormatter.ofPattern("dd/MM")
    return when (date) {
        today -> "Hoje, ${date.format(short)}"
        today.minusDays(1) -> "Ontem, ${date.format(short)}"
        else -> date.format(DateTimeFormatter.ofPattern("EEE, dd 'de' MMM", PtBr))
    }
}

// --- Resumo do dia (web: DailySummaryCard = anel de calorias + tiles de macros) ---

@Composable
private fun DailySummaryCard(
    consumed: Int,
    target: Int,
    burned: Int,
    remaining: Int,
    percent: Float,
    protein: Double,
    carbs: Double,
    fat: Double,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            CalorieRing(
                consumed = consumed,
                burned = burned,
                remaining = remaining,
                percent = percent,
            )
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                MacroTile(label = "Proteina", value = protein, unit = "g")
                MacroTile(label = "Carboidrato", value = carbs, unit = "g")
                MacroTile(label = "Gordura", value = fat, unit = "g")
            }
        }
    }
}

@Composable
private fun CalorieRing(
    consumed: Int,
    burned: Int,
    remaining: Int,
    percent: Float,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        RingStat(
            label = "Consumidas",
            value = consumed,
            icon = { PacManIcon() },
            modifier = Modifier.weight(1f),
        )

        val trackColor = MaterialTheme.colorScheme.surfaceVariant
        val progressColor = MaterialTheme.colorScheme.primary
        Box(modifier = Modifier.size(116.dp), contentAlignment = Alignment.Center) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val strokePx = 10.dp.toPx()
                val inset = strokePx / 2
                val arcSize = Size(size.width - strokePx, size.height - strokePx)
                drawArc(
                    color = trackColor,
                    startAngle = 0f,
                    sweepAngle = 360f,
                    useCenter = false,
                    topLeft = Offset(inset, inset),
                    size = arcSize,
                    style = Stroke(width = strokePx),
                )
                drawArc(
                    color = progressColor,
                    startAngle = -90f,
                    sweepAngle = 360f * (percent.coerceIn(0f, 100f) / 100f),
                    useCenter = false,
                    topLeft = Offset(inset, inset),
                    size = arcSize,
                    style = Stroke(width = strokePx, cap = StrokeCap.Round),
                )
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "$remaining",
                    fontFamily = BebasNeue,
                    fontSize = 30.sp,
                    lineHeight = 30.sp,
                )
                Text(
                    text = "Restantes",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        RingStat(
            label = "Queimadas",
            value = burned,
            icon = {
                Icon(
                    Icons.Filled.LocalFireDepartment,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
            },
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun RingStat(
    label: String,
    value: Int,
    icon: @Composable () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        icon()
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = "$value",
            fontFamily = BebasNeue,
            fontSize = 20.sp,
        )
    }
}

// Lucide nao tem pac-man e o Material tambem nao: circulo com "boca" para a direita.
@Composable
private fun PacManIcon(modifier: Modifier = Modifier) {
    val color = MaterialTheme.colorScheme.primary
    Canvas(modifier = modifier.size(16.dp)) {
        drawArc(color = color, startAngle = 30f, sweepAngle = 300f, useCenter = true)
    }
}

@Composable
private fun RowScope.MacroTile(label: String, value: Double, unit: String) {
    Column(
        modifier = Modifier
            .weight(1f)
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = label,
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(
                text = "%.1f".format(value),
                fontFamily = BebasNeue,
                fontSize = 18.sp,
            )
            Text(
                text = unit,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 1.dp),
            )
        }
    }
}

// --- Secoes de refeicao (web: 4 cards fixos com icone circular, kcal e itens) ---

private val MEAL_ICONS: Map<MealType, ImageVector> = mapOf(
    MealType.BREAKFAST to Icons.Filled.Coffee,
    MealType.LUNCH to Icons.Filled.SoupKitchen,
    MealType.SNACK to Icons.Filled.Cookie,
    MealType.DINNER to Icons.Filled.DarkMode,
)

@Composable
private fun MealSection(
    mealType: MealType,
    meals: List<LocalMeal>,
    expanded: Boolean,
    onHeaderClick: () -> Unit,
    onActionClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val items = meals.flatMap { it.items }
    val kcal = items.sumOf { it.kcal }
    val photoUrl = meals.firstNotNullOfOrNull { it.photoUrl }

    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onHeaderClick)
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (photoUrl != null) {
                AsyncImage(
                    model = photoUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(40.dp).clip(CircleShape),
                )
            } else {
                MealIconBadge(mealType = mealType)
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = mealType.label,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                )
                Text(
                    text = "${kcal.roundToInt()} kcal · ${items.size} item(ns)",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            OutlinedIconButton(onClick = onActionClick, modifier = Modifier.size(40.dp)) {
                Icon(
                    imageVector = if (items.isEmpty()) Icons.Filled.Add else Icons.Filled.Edit,
                    contentDescription = if (items.isEmpty()) {
                        "Adicionar item em ${mealType.label}"
                    } else {
                        "Editar ${mealType.label}"
                    },
                    modifier = Modifier.size(16.dp),
                )
            }
        }
        if (expanded && meals.isNotEmpty()) {
            HorizontalDivider(color = MaterialTheme.colorScheme.outline)
            meals.forEachIndexed { groupIndex, meal ->
                if (meals.size > 1) {
                    Text(
                        text = "Registro ${groupIndex + 1}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
                            .padding(horizontal = 16.dp, vertical = 6.dp),
                    )
                }
                meal.items.forEachIndexed { index, item ->
                    if (groupIndex > 0 || index > 0) {
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    }
                    MealItemRow(item = item)
                }
            }
        }
    }
}

@Composable
private fun MealIconBadge(mealType: MealType, modifier: Modifier = Modifier) {
    Box(modifier = modifier.size(40.dp)) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = MEAL_ICONS.getValue(mealType),
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = MaterialTheme.colorScheme.primary,
            )
        }
        Box(
            modifier = Modifier
                .size(16.dp)
                .align(Alignment.BottomEnd)
                .offset(x = 2.dp, y = 2.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary)
                .border(1.dp, MaterialTheme.colorScheme.background, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Filled.PhotoCamera,
                contentDescription = null,
                modifier = Modifier.size(10.dp),
                tint = MaterialTheme.colorScheme.onPrimary,
            )
        }
    }
}

@Composable
private fun MealItemRow(item: LocalMealItem, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.foodName,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = "${formatNumber(item.grams)}g - ${formatNumber(item.proteinG)}P / " +
                    "${formatNumber(item.carbsG)}C / ${formatNumber(item.fatG)}G",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            text = "${item.kcal.roundToInt()}",
            fontFamily = BebasNeue,
            fontSize = 20.sp,
            textAlign = TextAlign.End,
        )
    }
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
