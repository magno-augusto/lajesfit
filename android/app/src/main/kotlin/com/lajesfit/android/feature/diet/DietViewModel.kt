package com.lajesfit.android.feature.diet

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lajesfit.android.feature.goals.GoalsRepository
import com.lajesfit.android.feature.workouts.LocalWorkout
import com.lajesfit.android.feature.workouts.WorkoutRepository
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
import kotlin.math.min
import kotlin.math.roundToInt

data class DietUiState(
    val selectedDate: LocalDate = LocalDate.now(),
    val meals: List<LocalMeal> = emptyList(),
    val workouts: List<LocalWorkout> = emptyList(),
    val calorieGoal: Int? = null,
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
) {
    val dayMeals: List<LocalMeal> = meals.filter { meal -> meal.consumedDate() == selectedDate }
    val dayWorkouts: List<LocalWorkout> = workouts.filter { workout ->
        workout.performedDate() == selectedDate
    }
    val consumed: Int = dayMeals.sumOf { meal -> meal.items.sumOf { it.kcal } }.roundToInt()
    val burned: Int = dayWorkouts.sumOf { workout -> workout.calories ?: 0.0 }.roundToInt()
    val remaining: Int = ((calorieGoal ?: 0) - consumed + burned).toDouble().roundToInt()
    val percent: Float = calorieGoal?.takeIf { it > 0 }?.let { goal ->
        min(100.0, consumed.toDouble() / goal * 100.0).toFloat()
    } ?: 0f
}

/** Espelha DiaryPage.tsx - ver android/specs/M4-dieta.md. */
@HiltViewModel
class DietViewModel @Inject constructor(
    private val dietRepository: DietRepository,
    private val goalsRepository: GoalsRepository,
    private val workoutRepository: WorkoutRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DietUiState())
    val uiState: StateFlow<DietUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun previousDay() {
        setSelectedDate(_uiState.value.selectedDate.minusDays(1))
    }

    fun nextDay() {
        setSelectedDate(_uiState.value.selectedDate.plusDays(1))
    }

    private fun setSelectedDate(date: LocalDate) {
        _uiState.update { it.copy(selectedDate = date) }
    }

    private fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val idrProfile = goalsRepository.getIdrProfile()
                val meals = dietRepository.getMeals()
                val workouts = runCatching {
                    workoutRepository.getWorkouts()
                }.getOrDefault(emptyList())
                _uiState.update {
                    it.copy(
                        meals = meals,
                        workouts = workouts,
                        calorieGoal = idrProfile?.idrCalories,
                        isLoading = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Nao foi possivel carregar a dieta")
                }
            }
        }
    }
}

private fun LocalMeal.consumedDate(): LocalDate? {
    return runCatching {
        Instant.parse(consumedAt).atZone(ZoneId.systemDefault()).toLocalDate()
    }.getOrNull()
}

private fun LocalWorkout.performedDate(): LocalDate? {
    return runCatching {
        Instant.parse(performedAt).atZone(ZoneId.systemDefault()).toLocalDate()
    }.getOrNull()
}
