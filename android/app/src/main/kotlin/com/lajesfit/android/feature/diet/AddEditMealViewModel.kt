package com.lajesfit.android.feature.diet

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import javax.inject.Inject
import kotlin.math.roundToInt

data class AddEditMealUiState(
    val meal: MealType = MealType.BREAKFAST,
    val selectedDate: LocalDate = LocalDate.now(),
    val query: String = "",
    val results: List<TacoFood> = emptyList(),
    val selectedFood: TacoFood? = null,
    val selectedMeasure: FoodMeasure? = null,
    val quantity: String = "100",
    val manualName: String = "",
    val manualBrand: String = "",
    val manualKcal: String = "",
    val manualProtein: String = "",
    val manualCarbs: String = "",
    val manualFat: String = "",
    val items: List<MealFoodInput> = emptyList(),
    val hasPhoto: Boolean = false,
    val isSearching: Boolean = false,
    val isSaving: Boolean = false,
    val done: Boolean = false,
    val errorMessage: String? = null,
) {
    val showManualForm: Boolean = query.trim().length >= 2 && !isSearching && results.isEmpty()
    val totalKcal: Int = items.sumOf { it.kcal }.roundToInt()
    val totalProtein: Double = items.sumOf { it.proteinG }
    val totalCarbs: Double = items.sumOf { it.carbsG }
    val totalFat: Double = items.sumOf { it.fatG }
}

@HiltViewModel
class AddEditMealViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val foodCatalogRepository: FoodCatalogRepository,
    private val dietRepository: DietRepository,
) : ViewModel() {

    private val initialMeal = savedStateHandle.get<String>("meal")
        ?.let { value -> MealType.entries.find { it.value == value } }
        ?: MealType.BREAKFAST
    private val initialDate = savedStateHandle.get<String>("date")
        ?.let { value -> runCatching { LocalDate.parse(value) }.getOrNull() }
        ?: LocalDate.now()

    private val _uiState = MutableStateFlow(AddEditMealUiState(meal = initialMeal, selectedDate = initialDate))
    val uiState: StateFlow<AddEditMealUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null
    private var photoBytes: ByteArray? = null

    fun onQueryChange(value: String) {
        _uiState.update {
            it.copy(query = value, selectedFood = null, selectedMeasure = null, errorMessage = null)
        }
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(400)
            search(value)
        }
    }

    fun selectFood(food: TacoFood) {
        _uiState.update {
            it.copy(
                selectedFood = food,
                selectedMeasure = food.measures.firstOrNull { measure -> measure.isDefault } ?: food.measures.firstOrNull(),
                quantity = food.measures.firstOrNull { measure -> measure.isDefault }?.grams?.let(::formatNumber)
                    ?: food.measures.firstOrNull()?.grams?.let(::formatNumber)
                    ?: "100",
                errorMessage = null,
            )
        }
    }

    fun selectScannedFood(foodJson: String) {
        val food = runCatching { Json.decodeFromString<TacoFood>(foodJson) }.getOrNull() ?: return
        _uiState.update { it.copy(query = food.name, results = listOf(food)) }
        selectFood(food)
    }

    fun onPhotoSelected(bytes: ByteArray?) {
        photoBytes = bytes
        _uiState.update { it.copy(hasPhoto = bytes != null, errorMessage = null) }
    }

    fun selectMeasure(measure: FoodMeasure?) {
        _uiState.update {
            it.copy(selectedMeasure = measure, quantity = measure?.grams?.let(::formatNumber) ?: it.quantity)
        }
    }

    fun onQuantityChange(value: String) {
        _uiState.update { it.copy(quantity = value.filterNumberText()) }
    }

    fun onManualNameChange(value: String) = _uiState.update { it.copy(manualName = value) }
    fun onManualBrandChange(value: String) = _uiState.update { it.copy(manualBrand = value) }
    fun onManualKcalChange(value: String) = _uiState.update { it.copy(manualKcal = value.filterNumberText()) }
    fun onManualProteinChange(value: String) = _uiState.update { it.copy(manualProtein = value.filterNumberText()) }
    fun onManualCarbsChange(value: String) = _uiState.update { it.copy(manualCarbs = value.filterNumberText()) }
    fun onManualFatChange(value: String) = _uiState.update { it.copy(manualFat = value.filterNumberText()) }

    fun addSelectedFood() {
        val state = _uiState.value
        val food = state.selectedFood ?: return
        val grams = state.quantity.toDoubleOrNull() ?: return
        addItem(food.name, grams, food.kcal, food.proteinG, food.carbsG, food.fatG)
        _uiState.update { it.copy(selectedFood = null, selectedMeasure = null, quantity = "100") }
    }

    fun addManualFood() {
        val state = _uiState.value
        val name = state.manualName.trim()
        val kcal = state.manualKcal.toDoubleOrNull() ?: 0.0
        val protein = state.manualProtein.toDoubleOrNull() ?: 0.0
        val carbs = state.manualCarbs.toDoubleOrNull() ?: 0.0
        val fat = state.manualFat.toDoubleOrNull() ?: 0.0
        if (name.isEmpty()) {
            _uiState.update { it.copy(errorMessage = "Informe o nome do alimento") }
            return
        }
        viewModelScope.launch {
            foodCatalogRepository.upsertCatalogFood(
                source = "manual",
                sourceId = null,
                name = name,
                category = null,
                brand = state.manualBrand.takeIf { it.isNotBlank() },
                kcal = kcal,
                proteinG = protein,
                carbsG = carbs,
                fatG = fat,
            )
            addItem(name, 100.0, kcal, protein, carbs, fat)
            _uiState.update {
                it.copy(
                    manualName = "",
                    manualBrand = "",
                    manualKcal = "",
                    manualProtein = "",
                    manualCarbs = "",
                    manualFat = "",
                    query = "",
                    results = emptyList(),
                )
            }
        }
    }

    fun removeSessionItem(index: Int) {
        _uiState.update { state ->
            state.copy(items = state.items.filterIndexed { itemIndex, _ -> itemIndex != index })
        }
    }

    fun save() {
        val state = _uiState.value
        if (state.isSaving) return
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, errorMessage = null) }
            try {
                dietRepository.addMealWithItems(
                    meal = state.meal,
                    items = state.items,
                    photoBytes = photoBytes,
                    consumedAt = state.selectedDate.atTime(LocalTime.now()).atZone(ZoneId.systemDefault()).toInstant(),
                )
                _uiState.update { it.copy(isSaving = false, done = true) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSaving = false, errorMessage = e.message ?: "Nao foi possivel salvar a refeicao")
                }
            }
        }
    }

    private suspend fun search(query: String) {
        if (query.trim().length < 2) {
            _uiState.update { it.copy(results = emptyList(), isSearching = false) }
            return
        }
        _uiState.update { it.copy(isSearching = true, errorMessage = null) }
        runCatching { foodCatalogRepository.searchFoods(query) }
            .onSuccess { foods -> _uiState.update { it.copy(results = foods, isSearching = false) } }
            .onFailure { error ->
                _uiState.update {
                    it.copy(isSearching = false, errorMessage = error.message ?: "Busca indisponivel")
                }
            }
    }

    private fun addItem(
        name: String,
        grams: Double,
        kcalPer100g: Double,
        proteinPer100g: Double,
        carbsPer100g: Double,
        fatPer100g: Double,
    ) {
        val factor = grams / 100.0
        val item = MealFoodInput(
            name = name,
            grams = grams,
            kcal = kcalPer100g * factor,
            proteinG = proteinPer100g * factor,
            carbsG = carbsPer100g * factor,
            fatG = fatPer100g * factor,
        )
        _uiState.update { it.copy(items = it.items + item, errorMessage = null) }
    }
}

private fun String.filterNumberText(): String {
    return filterIndexed { index, char -> char.isDigit() || char == '.' || (char == ',' && index > 0) }
        .replace(',', '.')
}

private fun formatNumber(value: Double): String {
    return if (value % 1.0 == 0.0) value.roundToInt().toString() else "%.1f".format(value)
}
