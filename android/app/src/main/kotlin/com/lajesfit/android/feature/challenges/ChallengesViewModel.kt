package com.lajesfit.android.feature.challenges

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChallengesUiState(
    val currentUserId: String? = null,
    val activeChallenge: Challenge? = null,
    val lastClosedChallenge: Challenge? = null,
    val activityCount: List<ActivityCountEntry> = emptyList(),
    val workoutDays: List<ActivityDaysEntry> = emptyList(),
    val distance: List<DistanceEntry> = emptyList(),
    val caloriesBurned: List<CaloriesEntry> = emptyList(),
    val weightLoss: List<WeightLossEntry> = emptyList(),
    val dietDays: List<ActivityDaysEntry> = emptyList(),
    val previousTopThree: List<WeightLossEntry> = emptyList(),
    val failedBoards: Set<ChallengeBoard> = emptySet(),
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val lifecycleErrorMessage: String? = null,
) {
    val hasAnyRanking: Boolean =
        activityCount.isNotEmpty() ||
            workoutDays.isNotEmpty() ||
            distance.isNotEmpty() ||
            caloriesBurned.isNotEmpty() ||
            weightLoss.isNotEmpty() ||
            dietDays.isNotEmpty()

}

@HiltViewModel
class ChallengesViewModel @Inject constructor(
    private val challengeRepository: ChallengeRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChallengesUiState())
    val uiState: StateFlow<ChallengesUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun refresh() {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null, lifecycleErrorMessage = null) }

            val currentUserId = challengeRepository.currentUserId()
            val lifecycleError = if (currentUserId != null) {
                runCatching { challengeRepository.ensureChallengeLifecycle() }.exceptionOrNull()
            } else {
                null
            }

            val generalErrors = mutableListOf<String>()
            val failedBoards = mutableSetOf<ChallengeBoard>()

            val activeChallenge = runCatching {
                challengeRepository.getActiveChallenge()
            }.onFailure { generalErrors += it.userMessage("Nao foi possivel carregar o desafio ativo") }
                .getOrNull()

            val lastClosedChallenge = runCatching {
                challengeRepository.getLastClosedChallenge()
            }.getOrNull()

            val activityCount = loadBoard(ChallengeBoard.ACTIVITIES, failedBoards) {
                challengeRepository.getActivityCountLeaderboard()
            }
            val workoutDays = loadBoard(ChallengeBoard.WORKOUT_DAYS, failedBoards) {
                challengeRepository.getWorkoutDaysLeaderboard()
            }
            val distance = loadBoard(ChallengeBoard.DISTANCE, failedBoards) {
                challengeRepository.getDistanceLeaderboard()
            }
            val caloriesBurned = loadBoard(ChallengeBoard.CALORIES, failedBoards) {
                challengeRepository.getCaloriesLeaderboard()
            }
            val dietDays = loadBoard(ChallengeBoard.DIET_DAYS, failedBoards) {
                challengeRepository.getDietDaysLeaderboard()
            }
            val weightLoss = activeChallenge?.let { challenge ->
                loadBoard(ChallengeBoard.WEIGHT_LOSS, failedBoards) {
                    challengeRepository.getWeightLeaderboard(challenge.id)
                }
            } ?: emptyList()

            val previousTopThree = lastClosedChallenge?.let { challenge ->
                runCatching { challengeRepository.getWeightLeaderboard(challenge.id).take(3) }
                    .getOrDefault(emptyList())
            }.orEmpty()

            _uiState.update {
                ChallengesUiState(
                    currentUserId = currentUserId,
                    activeChallenge = activeChallenge,
                    lastClosedChallenge = lastClosedChallenge,
                    activityCount = activityCount,
                    workoutDays = workoutDays,
                    distance = distance,
                    caloriesBurned = caloriesBurned,
                    weightLoss = weightLoss,
                    dietDays = dietDays,
                    previousTopThree = previousTopThree,
                    failedBoards = failedBoards,
                    isLoading = false,
                    errorMessage = generalErrors.firstOrNull(),
                    lifecycleErrorMessage = lifecycleError?.userMessage("Nao foi possivel atualizar o ciclo do desafio"),
                )
            }
        }
    }

    private suspend fun <T> loadBoard(
        board: ChallengeBoard,
        failedBoards: MutableSet<ChallengeBoard>,
        block: suspend () -> List<T>,
    ): List<T> {
        return runCatching { block() }.getOrElse {
            failedBoards += board
            emptyList()
        }
    }
}

private fun Throwable.userMessage(fallback: String): String {
    return message?.takeIf { it.isNotBlank() } ?: fallback
}
