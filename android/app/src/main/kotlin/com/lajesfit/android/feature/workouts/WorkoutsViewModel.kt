package com.lajesfit.android.feature.workouts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.SavedStateHandle
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
    val healthConnectStatus: HealthConnectStatus = HealthConnectStatus.UNAVAILABLE,
    val isLoading: Boolean = true,
    val isSyncingHealthConnect: Boolean = false,
    val healthConnectSyncMessage: String? = null,
    val errorMessage: String? = null,
) {
    val monthTotals: WorkoutMonthTotals = workouts.monthTotals()
}

@HiltViewModel
class WorkoutsViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val workoutRepository: WorkoutRepository,
    private val healthConnectSync: HealthConnectSync,
) : ViewModel() {

    private val _uiState = MutableStateFlow(WorkoutsUiState())
    val uiState: StateFlow<WorkoutsUiState> = _uiState.asStateFlow()

    init {
        load()
        refreshHealthConnectStatus()
        viewModelScope.launch {
            savedStateHandle.getStateFlow(REFRESH_KEY, false).collect { shouldRefresh ->
                if (shouldRefresh) {
                    savedStateHandle[REFRESH_KEY] = false
                    load()
                }
            }
        }
    }

    fun refresh() {
        load()
    }

    val healthConnectPermissions: Set<String>
        get() = healthConnectSync.permissions

    fun refreshHealthConnectStatus() {
        viewModelScope.launch {
            val status = runCatching { healthConnectSync.status() }
                .getOrDefault(HealthConnectStatus.UNAVAILABLE)
            _uiState.update { it.copy(healthConnectStatus = status) }
        }
    }

    fun onHealthPermissionsResult(grantedPermissions: Set<String>) {
        _uiState.update {
            it.copy(
                healthConnectStatus = if (grantedPermissions.containsAll(healthConnectSync.permissions)) {
                    HealthConnectStatus.READY
                } else {
                    HealthConnectStatus.NEEDS_PERMISSION
                },
            )
        }
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

    fun syncHealthConnect() {
        if (_uiState.value.isSyncingHealthConnect) return
        viewModelScope.launch {
            _uiState.update { it.copy(isSyncingHealthConnect = true, healthConnectSyncMessage = null, errorMessage = null) }
            try {
                val sessions = healthConnectSync.readMonthlyWorkouts()
                val result = workoutRepository.upsertHealthConnectWorkouts(sessions)
                _uiState.update { it.copy(isSyncingHealthConnect = false, healthConnectSyncMessage = result.toMessage()) }
                load()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSyncingHealthConnect = false,
                        errorMessage = e.message ?: "Nao foi possivel sincronizar com o Health Connect",
                    )
                }
            }
        }
    }

    fun removeWorkout(id: String) {
        viewModelScope.launch {
            try {
                workoutRepository.removeWorkout(id)
                _uiState.update { state -> state.copy(workouts = state.workouts.filterNot { it.id == id }) }
            } catch (e: Exception) {
                _uiState.update { it.copy(errorMessage = e.message ?: "Nao foi possivel remover o treino") }
            }
        }
    }

    companion object {
        const val REFRESH_KEY = "workouts_refresh"
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

private fun HealthConnectSyncResult.toMessage(): String {
    if (imported == 0 && updated == 0) return "Nenhuma sessao nova encontrada"
    return buildList {
        if (imported > 0) add("$imported importado(s)")
        if (updated > 0) add("$updated atualizado(s)")
    }.joinToString(", ")
}
