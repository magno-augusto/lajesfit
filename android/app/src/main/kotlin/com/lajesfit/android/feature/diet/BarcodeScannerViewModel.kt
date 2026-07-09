package com.lajesfit.android.feature.diet

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import javax.inject.Inject

data class BarcodeScannerUiState(
    val manualBarcode: String = "",
    val isLookingUp: Boolean = false,
    val errorMessage: String? = null,
    val resultJson: String? = null,
)

@HiltViewModel
class BarcodeScannerViewModel @Inject constructor(
    private val foodCatalogRepository: FoodCatalogRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(BarcodeScannerUiState())
    val uiState: StateFlow<BarcodeScannerUiState> = _uiState.asStateFlow()

    private var lastBarcode: String? = null

    fun onManualBarcodeChange(value: String) {
        _uiState.update { it.copy(manualBarcode = value.filter { char -> char.isLetterOrDigit() }) }
    }

    fun lookupDetectedBarcode(barcode: String) {
        val cleanBarcode = barcode.trim()
        if (cleanBarcode.isEmpty() || cleanBarcode == lastBarcode || _uiState.value.isLookingUp) return
        lastBarcode = cleanBarcode
        lookup(cleanBarcode)
    }

    fun lookupManualBarcode() {
        lastBarcode = null
        lookup(_uiState.value.manualBarcode)
    }

    private fun lookup(barcode: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLookingUp = true, errorMessage = null) }
            runCatching { foodCatalogRepository.lookupOpenFoodFactsByBarcode(barcode) }
                .onSuccess { food ->
                    if (food == null) {
                        _uiState.update {
                            it.copy(isLookingUp = false, errorMessage = "Produto nao encontrado. Digite o codigo manualmente.")
                        }
                    } else {
                        _uiState.update { it.copy(isLookingUp = false, resultJson = Json.encodeToString(food)) }
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(isLookingUp = false, errorMessage = error.message ?: "Nao foi possivel consultar o codigo")
                    }
                }
        }
    }
}
