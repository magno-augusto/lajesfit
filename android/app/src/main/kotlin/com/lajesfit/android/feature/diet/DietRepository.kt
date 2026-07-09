package com.lajesfit.android.feature.diet

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
private data class DietEntryRow(
    val id: String,
    @SerialName("diet_meal_id") val dietMealId: String? = null,
    @SerialName("food_name") val foodName: String,
    val meal: String,
    val grams: Double,
    val kcal: Double,
    @SerialName("protein_g") val proteinG: Double = 0.0,
    @SerialName("carbs_g") val carbsG: Double = 0.0,
    @SerialName("fat_g") val fatG: Double = 0.0,
    @SerialName("photo_url") val photoUrl: String? = null,
    @SerialName("consumed_at") val consumedAt: String,
    @SerialName("diet_meals") val dietMeal: DietMealPhotoRow? = null,
)

@Serializable
private data class DietMealPhotoRow(
    @SerialName("photo_url") val photoUrl: String? = null,
)

@Serializable
private data class DietMealInsert(
    @SerialName("user_id") val userId: String,
    val meal: String,
    @SerialName("photo_url") val photoUrl: String? = null,
    @SerialName("consumed_at") val consumedAt: String,
)

@Serializable
private data class DietMealIdRow(val id: String)

@Serializable
private data class DietEntryInsert(
    @SerialName("user_id") val userId: String,
    @SerialName("diet_meal_id") val dietMealId: String,
    @SerialName("food_name") val foodName: String,
    val meal: String,
    val grams: Double,
    val kcal: Double,
    @SerialName("protein_g") val proteinG: Double,
    @SerialName("carbs_g") val carbsG: Double,
    @SerialName("fat_g") val fatG: Double,
    @SerialName("photo_url") val photoUrl: String? = null,
    @SerialName("consumed_at") val consumedAt: String,
)

@Serializable
private data class DietPostInsert(
    @SerialName("user_id") val userId: String,
    val content: String,
    @SerialName("media_url") val mediaUrl: String? = null,
)

/** Espelha a leitura de meals-api.ts - ver android/specs/M4-dieta.md. */
@Singleton
class DietRepository @Inject constructor(
    private val supabaseClient: SupabaseClient,
) {

    suspend fun getMeals(): List<LocalMeal> {
        val userId = supabaseClient.auth.currentUserOrNull()?.id ?: return emptyList()
        val rows = try {
            fetchEntryRows(userId, SELECT_WITH_MEAL_PHOTO)
        } catch (e: PostgrestRestException) {
            fetchEntryRows(userId, SELECT_WITHOUT_MEAL_PHOTO)
        }
        return rows.toLocalMeals()
    }

    suspend fun addMealWithItems(
        meal: MealType,
        items: List<MealFoodInput>,
        photoBytes: ByteArray? = null,
        consumedAt: Instant = Instant.now(),
    ): List<LocalMeal> {
        val userId = supabaseClient.auth.currentUserOrNull()?.id ?: return emptyList()
        val effectiveItems = items.ifEmpty {
            listOf(
                MealFoodInput(
                    name = "Refeicao registrada",
                    grams = 0.0,
                    kcal = 0.0,
                    proteinG = 0.0,
                    carbsG = 0.0,
                    fatG = 0.0,
                ),
            )
        }
        val consumedAtText = consumedAt.toString()
        val photoUrl = photoBytes?.let { uploadMealPhoto(userId, meal, consumedAt, it) }
        val mealRow = supabaseClient.postgrest.from("diet_meals")
            .insert(
                DietMealInsert(
                    userId = userId,
                    meal = meal.value,
                    photoUrl = photoUrl,
                    consumedAt = consumedAtText,
                ),
            ) {
                select(columns = Columns.list("id"))
            }
            .decodeSingle<DietMealIdRow>()

        supabaseClient.postgrest.from("diet_entries")
            .insert(
                effectiveItems.map { item ->
                    DietEntryInsert(
                        userId = userId,
                        dietMealId = mealRow.id,
                        foodName = item.name,
                        meal = meal.value,
                        grams = item.grams,
                        kcal = item.kcal,
                        proteinG = item.proteinG,
                        carbsG = item.carbsG,
                        fatG = item.fatG,
                        photoUrl = photoUrl,
                        consumedAt = consumedAtText,
                    )
                },
            )

        supabaseClient.postgrest.from("posts")
            .insert(DietPostInsert(userId = userId, content = mealPostContent(meal, items), mediaUrl = photoUrl))

        return getMeals()
    }

    private suspend fun uploadMealPhoto(
        userId: String,
        meal: MealType,
        consumedAt: Instant,
        photoBytes: ByteArray,
    ): String {
        val fileName = "${consumedAt.toEpochMilli()}-${meal.label.sanitizePhotoName()}.jpg"
        val path = "$userId/meals/$fileName"
        val bucket = supabaseClient.storage.from("media")
        bucket.upload(path, photoBytes) {
            upsert = true
        }
        return bucket.createSignedUrl(path, MEAL_PHOTO_SIGNED_URL_DURATION)
    }

    private suspend fun fetchEntryRows(userId: String, columns: Columns): List<DietEntryRow> {
        return supabaseClient.postgrest.from("diet_entries")
            .select(columns = columns) {
                filter { eq("user_id", userId) }
                order("consumed_at", Order.DESCENDING)
            }
            .decodeList<DietEntryRow>()
    }

    private fun List<DietEntryRow>.toLocalMeals(): List<LocalMeal> {
        return groupBy { row -> row.dietMealId ?: row.id }
            .values
            .mapNotNull { rows ->
                val first = rows.firstOrNull() ?: return@mapNotNull null
                val meal = MealType.entries.find { it.value == first.meal } ?: return@mapNotNull null
                LocalMeal(
                    dietMealId = first.dietMealId,
                    meal = meal,
                    photoUrl = first.dietMeal?.photoUrl ?: first.photoUrl,
                    consumedAt = first.consumedAt,
                    items = rows.map { row ->
                        LocalMealItem(
                            foodName = row.foodName,
                            grams = row.grams,
                            kcal = row.kcal,
                            proteinG = row.proteinG,
                            carbsG = row.carbsG,
                            fatG = row.fatG,
                        )
                    },
                )
            }
            .sortedByDescending { it.consumedAt }
    }

    private fun mealPostContent(meal: MealType, originalItems: List<MealFoodInput>): String {
        if (originalItems.isEmpty()) return "${meal.label} registrado na dieta."
        val kcal = originalItems.sumOf { it.kcal }.roundToInt()
        val protein = originalItems.sumOf { it.proteinG }
        val carbs = originalItems.sumOf { it.carbsG }
        val fat = originalItems.sumOf { it.fatG }
        val itemLines = originalItems.joinToString("\n") { item ->
            "- ${formatPostNumber(item.grams)}g ${item.name}"
        }
        return "${meal.label} registrado na dieta.\n" +
            "Total: $kcal kcal - ${String.format(Locale.US, "%.1f", protein)}P / " +
            "${String.format(Locale.US, "%.1f", carbs)}C / ${String.format(Locale.US, "%.1f", fat)}G.\n" +
            "Itens:\n" +
            itemLines
    }

    private fun formatPostNumber(value: Double): String {
        return if (value % 1.0 == 0.0) value.roundToInt().toString() else String.format(Locale.US, "%.1f", value)
    }

    companion object {
        private val MEAL_PHOTO_SIGNED_URL_DURATION = (60 * 60 * 24 * 365 * 5).seconds
        private val SELECT_WITH_MEAL_PHOTO = Columns.raw(
            "id, diet_meal_id, food_name, meal, grams, kcal, protein_g, carbs_g, fat_g, photo_url, consumed_at, diet_meals(photo_url)",
        )
        private val SELECT_WITHOUT_MEAL_PHOTO = Columns.list(
            "id",
            "diet_meal_id",
            "food_name",
            "meal",
            "grams",
            "kcal",
            "protein_g",
            "carbs_g",
            "fat_g",
            "photo_url",
            "consumed_at",
        )
    }
}

private fun String.sanitizePhotoName(): String {
    return lowercase(Locale.ROOT)
        .replace(Regex("[^a-z0-9]+"), "-")
        .trim('-')
        .ifBlank { "refeicao" }
}
