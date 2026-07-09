package com.lajesfit.android.feature.diet

import kotlinx.serialization.Serializable

enum class MealType(val value: String, val label: String) {
    BREAKFAST("breakfast", "Cafe da manha"),
    LUNCH("lunch", "Almoco"),
    SNACK("snack", "Lanche"),
    DINNER("dinner", "Jantar"),
}

data class LocalMeal(
    val dietMealId: String?,
    val meal: MealType,
    val photoUrl: String?,
    val consumedAt: String,
    val items: List<LocalMealItem>,
)

data class LocalMealItem(
    val foodName: String,
    val grams: Double,
    val kcal: Double,
    val proteinG: Double,
    val carbsG: Double,
    val fatG: Double,
)

@Serializable
data class FoodMeasure(
    val label: String,
    val unit: String,
    val grams: Double,
    val isDefault: Boolean,
)

@Serializable
data class TacoFood(
    val id: Long,
    val source: String,
    val sourceId: String?,
    val name: String,
    val category: String?,
    val brand: String?,
    val kcal: Double,
    val proteinG: Double,
    val carbsG: Double,
    val fatG: Double,
    val fiberG: Double,
    val measures: List<FoodMeasure> = emptyList(),
)

data class MealFoodInput(
    val name: String,
    val grams: Double,
    val kcal: Double,
    val proteinG: Double,
    val carbsG: Double,
    val fatG: Double,
)
