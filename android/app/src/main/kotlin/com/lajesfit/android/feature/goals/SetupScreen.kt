package com.lajesfit.android.feature.goals

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lajesfit.android.feature.auth.AuthRepository
import com.lajesfit.android.ui.theme.LajesFitTheme
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class UsernameStatus { IDLE, INVALID, CHECKING, AVAILABLE, TAKEN }

data class SetupUiState(
    val name: String = "",
    val username: String = "",
    val usernameStatus: UsernameStatus = UsernameStatus.IDLE,
    val sex: Sex = Sex.FEMALE,
    val age: Int = 30,
    val weightKg: Double = 70.0,
    val heightCm: Int = 170,
    val activityLevel: ActivityLevel = ActivityLevel.MODERATE,
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
)

/** Espelha IdrSetup.tsx - ver android/specs/M2-onboarding.md. */
@HiltViewModel
class SetupViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val goalsRepository: GoalsRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SetupUiState())
    val uiState: StateFlow<SetupUiState> = _uiState.asStateFlow()

    // Debounce da checagem de disponibilidade (500ms, mesmo tempo do web) - cancela a busca
    // anterior a cada tecla digitada em vez de empilhar requisicoes.
    private var usernameCheckJob: Job? = null

    init {
        viewModelScope.launch {
            val current = goalsRepository.getMyUsername()
            if (current.isNotEmpty()) {
                _uiState.update { it.copy(username = current) }
                checkUsername(current)
            }
        }
    }

    fun currentIdrCalories(): Int = goalsRepository.calculateIdr(uiState.value.toIdrInput())

    fun onNameChange(value: String) {
        _uiState.update { it.copy(name = value) }
    }

    fun onUsernameChange(value: String) {
        val normalized = authRepository.normalizeUsername(value)
        _uiState.update { it.copy(username = normalized, errorMessage = null) }
        checkUsername(normalized)
    }

    private fun checkUsername(username: String) {
        usernameCheckJob?.cancel()
        if (username.isEmpty()) {
            _uiState.update { it.copy(usernameStatus = UsernameStatus.IDLE) }
            return
        }
        if (username.length < 3) {
            _uiState.update { it.copy(usernameStatus = UsernameStatus.INVALID) }
            return
        }
        _uiState.update { it.copy(usernameStatus = UsernameStatus.CHECKING) }
        usernameCheckJob = viewModelScope.launch {
            delay(500)
            val available = try {
                goalsRepository.checkUsernameAvailable(username)
            } catch (e: Exception) {
                null
            }
            _uiState.update {
                it.copy(
                    usernameStatus = when (available) {
                        true -> UsernameStatus.AVAILABLE
                        false -> UsernameStatus.TAKEN
                        null -> UsernameStatus.IDLE
                    },
                )
            }
        }
    }

    fun onSexChange(value: Sex) = _uiState.update { it.copy(sex = value) }
    fun onAgeChange(value: Int) = _uiState.update { it.copy(age = value.coerceIn(12, 100)) }
    fun onWeightChange(value: Double) = _uiState.update { it.copy(weightKg = value.coerceIn(30.0, 250.0)) }
    fun onHeightChange(value: Int) = _uiState.update { it.copy(heightCm = value.coerceIn(120, 230)) }
    fun onActivityLevelChange(value: ActivityLevel) = _uiState.update { it.copy(activityLevel = value) }

    fun submit(onDone: () -> Unit) {
        val state = _uiState.value
        if (state.name.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Informe seu nome para continuar") }
            return
        }
        val cleanUsername = authRepository.normalizeUsername(state.username)
        if (cleanUsername.length < 3) {
            _uiState.update {
                it.copy(errorMessage = "Escolha um nome de usuario com pelo menos 3 caracteres")
            }
            return
        }
        if (state.usernameStatus == UsernameStatus.TAKEN) {
            _uiState.update { it.copy(errorMessage = "Esse nome de usuario ja esta em uso") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, errorMessage = null) }
            try {
                val available = goalsRepository.checkUsernameAvailable(cleanUsername)
                if (!available) {
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            usernameStatus = UsernameStatus.TAKEN,
                            errorMessage = "Esse nome de usuario ja esta em uso",
                        )
                    }
                    return@launch
                }
                goalsRepository.saveIdrProfile(
                    input = state.copy(name = state.name.trim()).toIdrInput(),
                    username = cleanUsername,
                )
                onDone()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSaving = false, errorMessage = e.message ?: "Nao foi possivel salvar seu objetivo")
                }
            }
        }
    }
}

private fun SetupUiState.toIdrInput() = IdrInput(
    name = name,
    sex = sex,
    age = age,
    weightKg = weightKg,
    heightCm = heightCm,
    activityLevel = activityLevel,
)

@Composable
fun SetupScreen(
    onDone: () -> Unit,
    viewModel: SetupViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    SetupScreenContent(
        uiState = uiState,
        previewCalories = viewModel.currentIdrCalories(),
        onNameChange = viewModel::onNameChange,
        onUsernameChange = viewModel::onUsernameChange,
        onSexChange = viewModel::onSexChange,
        onAgeChange = viewModel::onAgeChange,
        onWeightChange = viewModel::onWeightChange,
        onHeightChange = viewModel::onHeightChange,
        onActivityLevelChange = viewModel::onActivityLevelChange,
        onSubmit = { viewModel.submit(onDone) },
    )
}

@Composable
private fun SetupScreenContent(
    uiState: SetupUiState,
    previewCalories: Int,
    onNameChange: (String) -> Unit,
    onUsernameChange: (String) -> Unit,
    onSexChange: (Sex) -> Unit,
    onAgeChange: (Int) -> Unit,
    onWeightChange: (Double) -> Unit,
    onHeightChange: (Int) -> Unit,
    onActivityLevelChange: (ActivityLevel) -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(text = "Primeiro acesso", style = MaterialTheme.typography.labelLarge)
        Text(text = "Calcule seu objetivo calorico", style = MaterialTheme.typography.headlineMedium)
        Text(
            text = "Responda os dados abaixo para definir sua meta diaria de calorias.",
            style = MaterialTheme.typography.bodyMedium,
        )

        OutlinedTextField(
            value = uiState.name,
            onValueChange = onNameChange,
            label = { Text("Nome") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedTextField(
            value = uiState.username,
            onValueChange = onUsernameChange,
            label = { Text("Nome de usuario") },
            singleLine = true,
            supportingText = {
                val message = when (uiState.usernameStatus) {
                    UsernameStatus.CHECKING -> "Verificando disponibilidade..."
                    UsernameStatus.AVAILABLE -> "@${uiState.username} esta disponivel"
                    UsernameStatus.TAKEN -> "Esse nome de usuario ja esta em uso"
                    UsernameStatus.INVALID -> "Use pelo menos 3 caracteres (letras minusculas, numeros e _)"
                    UsernameStatus.IDLE -> null
                }
                if (message != null) Text(message)
            },
            isError = uiState.usernameStatus == UsernameStatus.TAKEN,
            modifier = Modifier.fillMaxWidth(),
        )

        Text(text = "Sexo biologico", style = MaterialTheme.typography.labelLarge)
        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
            Sex.entries.forEachIndexed { index, sex ->
                SegmentedButton(
                    selected = uiState.sex == sex,
                    onClick = { onSexChange(sex) },
                    shape = SegmentedButtonDefaults.itemShape(index = index, count = Sex.entries.size),
                ) {
                    Text(sex.label)
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = uiState.age.toString(),
                onValueChange = { text -> text.toIntOrNull()?.let(onAgeChange) },
                label = { Text("Idade") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth().weight(1f),
            )
            OutlinedTextField(
                value = formatDecimal(uiState.weightKg),
                onValueChange = { text -> text.replace(",", ".").toDoubleOrNull()?.let(onWeightChange) },
                label = { Text("Peso (kg)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth().weight(1f),
            )
            OutlinedTextField(
                value = uiState.heightCm.toString(),
                onValueChange = { text -> text.toIntOrNull()?.let(onHeightChange) },
                label = { Text("Altura (cm)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth().weight(1f),
            )
        }

        ActivityLevelField(selected = uiState.activityLevel, onSelected = onActivityLevelChange)

        Text(
            text = "Previa da meta: $previewCalories kcal/dia",
            style = MaterialTheme.typography.titleMedium,
        )
        Text(
            text = "Esse sera seu objetivo calorico diario. Refeicoes subtraem calorias; exercicios " +
                "adicionam calorias disponiveis ao dia.",
            style = MaterialTheme.typography.bodySmall,
        )

        if (uiState.errorMessage != null) {
            Text(text = uiState.errorMessage, color = MaterialTheme.colorScheme.error)
        }

        Button(onClick = onSubmit, enabled = !uiState.isSaving, modifier = Modifier.fillMaxWidth()) {
            if (uiState.isSaving) {
                CircularProgressIndicator(modifier = Modifier.size(16.dp).padding(end = 8.dp), strokeWidth = 2.dp)
            }
            Text("Salvar objetivo e abrir app")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ActivityLevelField(selected: ActivityLevel, onSelected: (ActivityLevel) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Text(text = "Nivel de atividade no dia a dia (sem contar treino)", style = MaterialTheme.typography.labelLarge)
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = selected.label,
            onValueChange = {},
            readOnly = true,
            modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            ActivityLevel.entries.forEach { level ->
                DropdownMenuItem(
                    text = { Text(level.label) },
                    onClick = {
                        onSelected(level)
                        expanded = false
                    },
                )
            }
        }
    }
}

private fun formatDecimal(value: Double): String =
    if (value == value.toLong().toDouble()) value.toLong().toString() else value.toString()

@Preview(showBackground = true)
@Composable
private fun SetupScreenPreview() {
    LajesFitTheme {
        SetupScreenContent(
            uiState = SetupUiState(name = "Atleta Lajes", username = "atleta_lajes"),
            previewCalories = 2100,
            onNameChange = {},
            onUsernameChange = {},
            onSexChange = {},
            onAgeChange = {},
            onWeightChange = {},
            onHeightChange = {},
            onActivityLevelChange = {},
            onSubmit = {},
        )
    }
}
