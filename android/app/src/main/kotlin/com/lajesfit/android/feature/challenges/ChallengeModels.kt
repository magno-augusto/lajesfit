package com.lajesfit.android.feature.challenges

data class Challenge(
    val id: String,
    val periodStart: String,
    val periodEnd: String,
    val status: ChallengeStatus,
)

enum class ChallengeStatus {
    ACTIVE,
    CLOSED,
}

enum class ChallengeBoard(
    val title: String,
    val description: String,
    val emptyMessage: String,
) {
    ACTIVITIES(
        title = "Atividades",
        description = "Quem registrou mais atividades fisicas neste mes.",
        emptyMessage = "Ninguem registrou atividade este mes ainda.",
    ),
    WORKOUT_DAYS(
        title = "Dias ativos",
        description = "Quem registrou atividade fisica em mais dias neste mes.",
        emptyMessage = "Ninguem registrou treino este mes ainda.",
    ),
    DISTANCE(
        title = "Distancia",
        description = "Quem caminhou e correu a maior distancia neste mes.",
        emptyMessage = "Ninguem registrou corrida ou caminhada este mes ainda.",
    ),
    CALORIES(
        title = "Calorias queimadas",
        description = "Quem queimou mais calorias em treinos neste mes.",
        emptyMessage = "Nenhum treino com calorias registrado este mes ainda.",
    ),
    WEIGHT_LOSS(
        title = "Peso perdido",
        description = "Quem perdeu o maior percentual de peso no desafio do mes.",
        emptyMessage = "Ninguem registrou o peso final ainda. Quando os participantes registrarem, o ranking aparece aqui.",
    ),
    DIET_DAYS(
        title = "Refeicoes",
        description = "Quem registrou refeicoes em mais dias neste mes.",
        emptyMessage = "Ninguem registrou refeicao este mes ainda.",
    ),
}

interface ChallengeRankedEntry {
    val userId: String
    val username: String
    val displayName: String
    val avatarUrl: String?
    val rank: Int
}

data class WeightLossEntry(
    override val userId: String,
    override val username: String,
    override val displayName: String,
    override val avatarUrl: String?,
    override val rank: Int,
    val pctLoss: Double,
) : ChallengeRankedEntry

data class ActivityCountEntry(
    override val userId: String,
    override val username: String,
    override val displayName: String,
    override val avatarUrl: String?,
    override val rank: Int,
    val activities: Int,
) : ChallengeRankedEntry

data class ActivityDaysEntry(
    override val userId: String,
    override val username: String,
    override val displayName: String,
    override val avatarUrl: String?,
    override val rank: Int,
    val activeDays: Int,
) : ChallengeRankedEntry

data class DistanceEntry(
    override val userId: String,
    override val username: String,
    override val displayName: String,
    override val avatarUrl: String?,
    override val rank: Int,
    val distanceMeters: Double,
) : ChallengeRankedEntry

data class CaloriesEntry(
    override val userId: String,
    override val username: String,
    override val displayName: String,
    override val avatarUrl: String?,
    override val rank: Int,
    val calories: Double,
) : ChallengeRankedEntry
