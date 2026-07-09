package com.lajesfit.android.feature.diet

import android.util.Log
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.rpc
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
private data class FoodRow(
    val id: Long,
    val source: String,
    @SerialName("source_id") val sourceId: String? = null,
    val name: String,
    val category: String? = null,
    val brand: String? = null,
    val kcal: Double = 0.0,
    @SerialName("protein_g") val proteinG: Double = 0.0,
    @SerialName("carbs_g") val carbsG: Double = 0.0,
    @SerialName("fat_g") val fatG: Double = 0.0,
    @SerialName("fiber_g") val fiberG: Double = 0.0,
)

@Serializable
private data class FoodMeasureRow(
    @SerialName("food_id") val foodId: Long,
    val label: String,
    val unit: String,
    val grams: Double,
    @SerialName("is_default") val isDefault: Boolean = false,
)

@Singleton
class FoodCatalogRepository @Inject constructor(
    private val supabaseClient: SupabaseClient,
    private val openFoodFactsClient: HttpClient,
) {
    suspend fun searchFoods(query: String): List<TacoFood> {
        val trimmed = query.trim()
        if (trimmed.length < 2) return emptyList()

        val foods = supabaseClient.postgrest
            .rpc(
                "search_foods",
                buildJsonObject {
                    put("p_query", trimmed)
                    put("p_limit", 20)
                },
            )
            .decodeList<FoodRow>()

        val ids = foods.map { it.id }
        val measuresByFoodId = if (ids.isEmpty()) {
            emptyMap()
        } else {
            supabaseClient.postgrest.from("food_measures")
                .select(columns = Columns.list("food_id", "label", "unit", "grams", "is_default")) {
                    filter { isIn("food_id", ids) }
                }
                .decodeList<FoodMeasureRow>()
                .groupBy { it.foodId }
        }

        return foods.map { row ->
            TacoFood(
                id = row.id,
                source = row.source,
                sourceId = row.sourceId,
                name = row.name,
                category = row.category,
                brand = row.brand,
                kcal = row.kcal,
                proteinG = row.proteinG,
                carbsG = row.carbsG,
                fatG = row.fatG,
                fiberG = row.fiberG,
                measures = measuresByFoodId[row.id].orEmpty().map { measure ->
                    FoodMeasure(
                        label = measure.label,
                        unit = measure.unit,
                        grams = measure.grams,
                        isDefault = measure.isDefault,
                    )
                },
            )
        }
    }

    suspend fun upsertCatalogFood(
        source: String,
        sourceId: String?,
        name: String,
        category: String?,
        brand: String?,
        kcal: Double,
        proteinG: Double,
        carbsG: Double,
        fatG: Double,
        fiberG: Double = 0.0,
        measures: List<FoodMeasure> = listOf(FoodMeasure("100 g", "g", 100.0, true)),
    ): Long {
        if (source != "open_food_facts" && source != "manual") return 0L
        return runCatching {
            supabaseClient.postgrest
                .rpc(
                    "upsert_catalog_food",
                    buildJsonObject {
                        put("p_source", source)
                        put("p_source_id", sourceId)
                        put("p_name", name)
                        put("p_category", category)
                        put("p_brand", brand)
                        put("p_kcal", kcal)
                        put("p_protein_g", proteinG)
                        put("p_carbs_g", carbsG)
                        put("p_fat_g", fatG)
                        put("p_fiber_g", fiberG)
                        put(
                            "p_measures",
                            JsonArray(
                                measures.map { measure ->
                                    buildJsonObject {
                                        put("label", measure.label)
                                        put("unit", measure.unit)
                                        put("grams", measure.grams)
                                        put("is_default", measure.isDefault)
                                    }
                                },
                            ),
                        )
                    },
                )
                .decodeAs<Long>()
        }.onFailure { error ->
            Log.w("FoodCatalogRepository", "upsert_catalog_food failed", error)
        }.getOrDefault(0L)
    }

    suspend fun lookupOpenFoodFactsByBarcode(barcode: String): TacoFood? {
        val cleanBarcode = barcode.trim()
        if (cleanBarcode.isEmpty()) return null
        val response = openFoodFactsClient
            .get("https://world.openfoodfacts.net/api/v2/product/$cleanBarcode.json?fields=code,product_name,product_name_pt,brands,categories,serving_size,nutriments")
            .body<OpenFoodFactsResponse>()
        if (response.status != 1) return null
        val product = response.product ?: return null
        val name = product.productNamePt?.takeIf { it.isNotBlank() }
            ?: product.productName?.takeIf { it.isNotBlank() }
            ?: return null
        val kcal = product.nutriments?.energyKcal100g ?: product.nutriments?.energyKcalValue ?: 0.0
        if (kcal <= 0.0) return null
        val measures = listOf(parseServingMeasure(product.servingSize) ?: FoodMeasure("100 g", "g", 100.0, true))
        val food = TacoFood(
            id = 0L,
            source = "open_food_facts",
            sourceId = response.code ?: cleanBarcode,
            name = name,
            category = product.categories,
            brand = product.brands,
            kcal = kcal,
            proteinG = product.nutriments?.proteins100g ?: 0.0,
            carbsG = product.nutriments?.carbohydrates100g ?: 0.0,
            fatG = product.nutriments?.fat100g ?: 0.0,
            fiberG = product.nutriments?.fiber100g ?: 0.0,
            measures = measures,
        )
        upsertCatalogFood(
            source = food.source,
            sourceId = food.sourceId,
            name = food.name,
            category = food.category,
            brand = food.brand,
            kcal = food.kcal,
            proteinG = food.proteinG,
            carbsG = food.carbsG,
            fatG = food.fatG,
            fiberG = food.fiberG,
            measures = food.measures,
        )
        return food
    }

    private fun parseServingMeasure(servingSize: String?): FoodMeasure? {
        val text = servingSize ?: return null
        val match = Regex("""(\d+(?:\.\d+)?)\s*(g|ml)""", RegexOption.IGNORE_CASE).find(text) ?: return null
        val grams = match.groupValues[1].toDoubleOrNull() ?: return null
        val unit = match.groupValues[2].lowercase()
        return FoodMeasure("Porcao", unit, grams, true)
    }
}

@Serializable
private data class OpenFoodFactsResponse(
    val code: String? = null,
    val status: Int = 0,
    val product: OpenFoodFactsProduct? = null,
)

@Serializable
private data class OpenFoodFactsProduct(
    @SerialName("product_name") val productName: String? = null,
    @SerialName("product_name_pt") val productNamePt: String? = null,
    val brands: String? = null,
    val categories: String? = null,
    @SerialName("serving_size") val servingSize: String? = null,
    val nutriments: OpenFoodFactsNutriments? = null,
)

@Serializable
private data class OpenFoodFactsNutriments(
    @SerialName("energy-kcal_100g") val energyKcal100g: Double? = null,
    @SerialName("energy-kcal_value") val energyKcalValue: Double? = null,
    @SerialName("proteins_100g") val proteins100g: Double? = null,
    @SerialName("carbohydrates_100g") val carbohydrates100g: Double? = null,
    @SerialName("fat_100g") val fat100g: Double? = null,
    @SerialName("fiber_100g") val fiber100g: Double? = null,
)
