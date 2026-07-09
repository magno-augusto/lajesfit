package com.lajesfit.android.feature.workouts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.math.roundToInt

data class WorkoutMonthTotals(
    val count: Int = 0,
    val durationSeconds: Int = 0,
    val distanceMeters: Double = 0.0,
    val calories: Int = 0,
)

data class WorkoutsUiState(
    val workouts: List<LocalWorkout> = emptyList(),
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
) {
    val monthTotals: WorkoutMonthTotals = workouts.monthTotals()
}

@HiltViewModel
class WorkoutsViewModel @Inject constructor(
    private val workoutRepository: WorkoutRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(WorkoutsUiState())
    val uiState: StateFlow<WorkoutsUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun refresh() {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                _uiState.update {
                    it.copy(
                        workouts = workoutRepository.getWorkouts(),
                        isLoading = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Nao foi possivel carregar os treinos")
                }
            }
        }
    }
}

private fun List<LocalWorkout>.monthTotals(): WorkoutMonthTotals {
    val today = LocalDate.now()
    val monthWorkouts = filter { workout ->
        workout.performedDate()?.let { it.month == today.month && it.year == today.year } == true
    }
    return WorkoutMonthTotals(
        count = monthWorkouts.size,
        durationSeconds = monthWorkouts.sumOf { it.durationSeconds ?: 0 },
        distanceMeters = monthWorkouts.sumOf { it.distanceMeters ?: 0.0 },
        calories = monthWorkouts.sumOf { it.calories ?: 0.0 }.roundToInt(),
    )
}

private fun LocalWorkout.performedDate(): LocalDate? {
    return runCatching {
        Instant.parse(performedAt).atZone(ZoneId.systemDefault()).toLocalDate()
    }.getOrNull()
}
