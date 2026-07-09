package com.lajesfit.android.feature.workouts

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.math.roundToInt

data class AddWorkoutUiState(
    val workoutId: String? = null,
    val activityType: String = WorkoutActivityType.RUN.label,
    val title: String = WorkoutActivityType.RUN.label,
    val performedAt: String = formatDateTimeInput(Instant.now().toString()),
    val distanceKm: String = "",
    val calories: String = "",
    val hours: String = "",
    val minutes: String = "",
    val mediaUrl: String? = null,
    val hasPhoto: Boolean = false,
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val done: Boolean = false,
    val errorMessage: String? = null,
) {
    val isEditing: Boolean = workoutId != null
    val showDistance: Boolean = activityType != WorkoutActivityType.STRENGTH.label
}

@HiltViewModel
class AddWorkoutViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val workoutRepository: WorkoutRepository,
) : ViewModel() {

    private val workoutId = savedStateHandle.get<String>("workoutId")

    private val _uiState = MutableStateFlow(AddWorkoutUiState(workoutId = workoutId))
    val uiState: StateFlow<AddWorkoutUiState> = _uiState.asStateFlow()

    private var photoBytes: ByteArray? = null

    init {
        if (workoutId != null) loadWorkout(workoutId)
    }

    fun onActivityTypeChange(value: String) {
        _uiState.update {
            it.copy(
                activityType = value,
                title = if (it.title.isBlank() || it.title == it.activityType) value else it.title,
                distanceKm = if (value == WorkoutActivityType.STRENGTH.label) "" else it.distanceKm,
                errorMessage = null,
            )
        }
    }

    fun onTitleChange(value: String) = _uiState.update { it.copy(title = value.take(120), errorMessage = null) }
    fun onPerformedAtChange(value: String) = _uiState.update { it.copy(performedAt = value, errorMessage = null) }
    fun onDistanceChange(value: String) = _uiState.update { it.copy(distanceKm = value.filterNumberText(), errorMessage = null) }
    fun onCaloriesChange(value: String) = _uiState.update { it.copy(calories = value.filterNumberText(), errorMessage = null) }
    fun onHoursChange(value: String) = _uiState.update { it.copy(hours = value.filterNumberText(), errorMessage = null) }
    fun onMinutesChange(value: String) = _uiState.update { it.copy(minutes = value.filterNumberText(), errorMessage = null) }

    fun onPhotoSelected(bytes: ByteArray?) {
        photoBytes = bytes
        _uiState.update { it.copy(hasPhoto = bytes != null || it.mediaUrl != null, errorMessage = null) }
    }

    fun save() {
        val state = _uiState.value
        if (state.isSaving) return
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, errorMessage = null) }
            try {
                val input = state.toInput()
                if (state.workoutId == null) {
                    workoutRepository.addWorkout(input, photoBytes)
                } else {
                    workoutRepository.updateWorkout(state.workoutId, input, photoBytes)
                }
                _uiState.update { it.copy(isSaving = false, done = true) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isSaving = false, errorMessage = e.message ?: "Nao foi possivel salvar o treino") }
            }
        }
    }

    private fun loadWorkout(id: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val workout = workoutRepository.getWorkout(id) ?: throw WorkoutException("Treino nao encontrado")
                val duration = workout.durationSeconds ?: 0
                _uiState.update {
                    it.copy(
                        workoutId = workout.id,
                        activityType = workout.activityType,
                        title = workout.title ?: workout.activityType,
                        performedAt = formatDateTimeInput(workout.performedAt),
                        distanceKm = workout.distanceMeters?.let { meters -> formatNumber(meters / 1000.0) } ?: "",
                        calories = workout.calories?.let(::formatNumber) ?: "",
                        hours = (duration / 3600).takeIf { value -> value > 0 }?.toString() ?: "",
                        minutes = ((duration % 3600) / 60).takeIf { value -> value > 0 }?.toString() ?: "",
                        mediaUrl = workout.mediaUrl,
                        hasPhoto = workout.mediaUrl != null,
                        isLoading = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, errorMessage = e.message ?: "Nao foi possivel carregar o treino") }
            }
        }
    }

    private fun AddWorkoutUiState.toInput(): WorkoutInput {
        val hoursValue = hours.toDoubleOrNull()?.roundToInt() ?: 0
        val minutesValue = minutes.toDoubleOrNull()?.roundToInt() ?: 0
        if (minutesValue !in 0..59) throw WorkoutException("Minutos deve ficar entre 0 e 59")
        val distance = if (showDistance) distanceKm.toDoubleOrNull()?.times(1000.0) else null
        val caloriesValue = calories.toDoubleOrNull()
        val performedInstant = parseDateTimeInput(performedAt)
        return WorkoutInput(
            activityType = activityType,
            title = title.trim().ifBlank { null },
            distanceMeters = distance,
            durationSeconds = (hoursValue * 3600 + minutesValue * 60).takeIf { it > 0 },
            calories = caloriesValue,
            performedAt = performedInstant.toString(),
            mediaUrl = mediaUrl,
        )
    }
}

private val DISPLAY_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")

private fun formatDateTimeInput(value: String): String {
    return runCatching {
        DISPLAY_FORMAT.format(Instant.parse(value).atZone(ZoneId.systemDefault()))
    }.getOrDefault("")
}

private fun parseDateTimeInput(value: String): Instant {
    val local = runCatching { LocalDateTime.parse(value, DISPLAY_FORMAT) }.getOrNull()
        ?: throw WorkoutException("Use data e hora no formato dd/mm/aaaa hh:mm")
    return local.atZone(ZoneId.systemDefault()).toInstant()
}

private fun String.filterNumberText(): String {
    return filterIndexed { index, char -> char.isDigit() || char == '.' || (char == ',' && index > 0) }
        .replace(',', '.')
}

private fun formatNumber(value: Double): String {
    return if (value % 1.0 == 0.0) value.roundToInt().toString() else "%.1f".format(value)
}
