package com.lajesfit.android.feature.goals

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.exception.PostgrestRestException
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.roundToInt

enum class Sex(val label: String) {
    FEMALE("Feminino"),
    MALE("Masculino"),
}

enum class ActivityLevel(val label: String, val factor: Double) {
    SEDENTARY("Trabalho sentado, pouca movimentacao no dia", 1.2),
    LIGHT("Fica em pe boa parte do dia (vendas, professor, recepcao)", 1.3),
    MODERATE("Caminha bastante no dia a dia (entregador, garcom, cuidador)", 1.4),
    ACTIVE("Trabalho fisico pesado (construcao, mudancas, carga e descarga)", 1.5),
    VERY_ACTIVE("Trabalho fisico muito intenso o dia inteiro", 1.6),
}

data class IdrInput(
    val name: String,
    val sex: Sex,
    val age: Int,
    val weightKg: Double,
    val heightCm: Int,
    val activityLevel: ActivityLevel,
)

data class IdrProfile(
    val name: String,
    val sex: Sex,
    val age: Int,
    val weightKg: Double,
    val heightCm: Int,
    val activityLevel: ActivityLevel,
    val idrCalories: Int,
)

@Serializable
private data class ProfileGoalsRow(
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("calorie_goal") val calorieGoal: Int? = null,
    @SerialName("goal_sex") val goalSex: String? = null,
    @SerialName("goal_age") val goalAge: Int? = null,
    @SerialName("goal_weight_kg") val goalWeightKg: Double? = null,
    @SerialName("goal_height_cm") val goalHeightCm: Int? = null,
    @SerialName("goal_activity_level") val goalActivityLevel: String? = null,
)

@Serializable
private data class UsernameRow(val username: String? = null)

@Serializable
private data class IdRow(val id: String? = null)

private const val USERNAME_UNIQUE_VIOLATION = "23505"

/**
 * Porta 1:1 as funcoes de goals-api.ts para Kotlin - ver android/specs/M2-onboarding.md
 * ("Comportamento do web a espelhar") para a justificativa de cada decisao. Primeiro repositorio
 * do app a usar Postgrest direto (nao-RPC) - estabelece o padrao pra M3+.
 */
@Singleton
class GoalsRepository @Inject constructor(
    private val supabaseClient: SupabaseClient,
) {

    fun calculateIdr(input: IdrInput): Int {
        val base = if (input.sex == Sex.MALE) {
            10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + 5
        } else {
            10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age - 161
        }
        return (base * input.activityLevel.factor).roundToInt()
    }

    suspend fun getIdrProfile(): IdrProfile? {
        val userId = supabaseClient.auth.currentUserOrNull()?.id ?: return null
        val row = supabaseClient.postgrest.from("profiles")
            .select(
                columns = Columns.list(
                    "display_name",
                    "calorie_goal",
                    "goal_sex",
                    "goal_age",
                    "goal_weight_kg",
                    "goal_height_cm",
                    "goal_activity_level",
                ),
            ) {
                filter { eq("id", userId) }
            }
            .decodeSingleOrNull<ProfileGoalsRow>()
        return mapProfile(row)
    }

    suspend fun getMyUsername(): String {
        val userId = supabaseClient.auth.currentUserOrNull()?.id ?: return ""
        val row = supabaseClient.postgrest.from("profiles")
            .select(columns = Columns.list("username")) {
                filter { eq("id", userId) }
            }
            .decodeSingleOrNull<UsernameRow>()
        return row?.username ?: ""
    }

    suspend fun checkUsernameAvailable(username: String): Boolean {
        val userId = supabaseClient.auth.currentUserOrNull()?.id ?: return false
        val row = supabaseClient.postgrest.from("profiles")
            .select(columns = Columns.list("id")) {
                filter {
                    eq("username", username)
                    neq("id", userId)
                }
            }
            .decodeSingleOrNull<IdRow>()
        return row == null
    }

    suspend fun saveIdrProfile(input: IdrInput, username: String? = null): IdrProfile {
        val userId = supabaseClient.auth.currentUserOrNull()?.id
            ?: throw GoalsException("Sem sessao ativa")
        val calorieGoal = calculateIdr(input)

        val body = buildJsonObject {
            username?.let { put("username", it) }
            put("display_name", input.name)
            put("calorie_goal", calorieGoal)
            put("goal_sex", input.sex.name.lowercase())
            put("goal_age", input.age)
            put("goal_weight_kg", input.weightKg)
            put("goal_height_cm", input.heightCm)
            put("goal_activity_level", input.activityLevel.name.lowercase())
        }

        val row = try {
            supabaseClient.postgrest.from("profiles")
                .update(body = body) {
                    select(
                        columns = Columns.list(
                            "display_name",
                            "calorie_goal",
                            "goal_sex",
                            "goal_age",
                            "goal_weight_kg",
                            "goal_height_cm",
                            "goal_activity_level",
                        ),
                    )
                    filter { eq("id", userId) }
                }
                .decodeSingleOrNull<ProfileGoalsRow>()
        } catch (e: PostgrestRestException) {
            if (e.code == USERNAME_UNIQUE_VIOLATION) {
                throw GoalsException(
                    "Esse nome de usuario acabou de ser escolhido por outra pessoa. Tente outro.",
                )
            }
            throw GoalsException(e.message ?: "Nao foi possivel salvar seu objetivo")
        }

        return mapProfile(row) ?: throw GoalsException("Nao foi possivel salvar seu objetivo")
    }

    private fun mapProfile(row: ProfileGoalsRow?): IdrProfile? {
        if (row == null || row.calorieGoal == null || row.calorieGoal == 0) return null
        val sex = row.goalSex?.let { value -> Sex.entries.find { it.name.lowercase() == value } }
        val activityLevel = row.goalActivityLevel?.let { value ->
            ActivityLevel.entries.find { it.name.lowercase() == value }
        }
        if (sex == null || activityLevel == null) return null
        val age = row.goalAge ?: return null
        val weightKg = row.goalWeightKg ?: return null
        val heightCm = row.goalHeightCm ?: return null

        return IdrProfile(
            name = row.displayName ?: "",
            sex = sex,
            age = age,
            weightKg = weightKg,
            heightCm = heightCm,
            activityLevel = activityLevel,
            idrCalories = row.calorieGoal,
        )
    }
}

class GoalsException(message: String) : Exception(message)
