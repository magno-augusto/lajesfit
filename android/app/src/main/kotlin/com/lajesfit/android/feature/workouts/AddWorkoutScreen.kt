package com.lajesfit.android.feature.workouts

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.lajesfit.android.feature.diet.compressMealPhoto
import com.lajesfit.android.ui.theme.LajesFitTheme

@Composable
fun AddWorkoutScreen(
    onDone: () -> Unit,
    viewModel: AddWorkoutViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val photoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        viewModel.onPhotoSelected(uri?.let { compressMealPhoto(context.contentResolver, it) })
    }
    LaunchedEffect(uiState.done) {
        if (uiState.done) onDone()
    }
    AddWorkoutContent(
        uiState = uiState,
        onDone = onDone,
        onActivityTypeChange = viewModel::onActivityTypeChange,
        onTitleChange = viewModel::onTitleChange,
        onPerformedAtChange = viewModel::onPerformedAtChange,
        onDistanceChange = viewModel::onDistanceChange,
        onCaloriesChange = viewModel::onCaloriesChange,
        onHoursChange = viewModel::onHoursChange,
        onMinutesChange = viewModel::onMinutesChange,
        onPickPhoto = { photoLauncher.launch("image/*") },
        onSave = viewModel::save,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddWorkoutContent(
    uiState: AddWorkoutUiState,
    onDone: () -> Unit,
    onActivityTypeChange: (String) -> Unit,
    onTitleChange: (String) -> Unit,
    onPerformedAtChange: (String) -> Unit,
    onDistanceChange: (String) -> Unit,
    onCaloriesChange: (String) -> Unit,
    onHoursChange: (String) -> Unit,
    onMinutesChange: (String) -> Unit,
    onPickPhoto: () -> Unit,
    onSave: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (uiState.isEditing) "Editar treino" else "Registrar treino") },
                navigationIcon = {
                    IconButton(onClick = onDone) {
                        Icon(Icons.Filled.Close, contentDescription = "Fechar")
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                ActivityTypeField(
                    activityType = uiState.activityType,
                    onActivityTypeChange = onActivityTypeChange,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                OutlinedTextField(
                    value = uiState.title,
                    onValueChange = onTitleChange,
                    label = { Text("Nome") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                OutlinedTextField(
                    value = uiState.performedAt,
                    onValueChange = onPerformedAtChange,
                    label = { Text("Data e hora") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (uiState.showDistance) {
                        NumberField("Distancia (km)", uiState.distanceKm, onDistanceChange, Modifier.weight(1f))
                    }
                    NumberField("Calorias", uiState.calories, onCaloriesChange, Modifier.weight(1f))
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    NumberField("Horas", uiState.hours, onHoursChange, Modifier.weight(1f))
                    NumberField("Minutos", uiState.minutes, onMinutesChange, Modifier.weight(1f))
                }
            }
            item {
                OutlinedButton(onClick = onPickPhoto, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Filled.PhotoCamera, contentDescription = null)
                    Text(if (uiState.hasPhoto) "Foto selecionada" else "Adicionar foto")
                }
            }
            uiState.errorMessage?.let { message ->
                item { Text(message, color = MaterialTheme.colorScheme.error) }
            }
            item {
                Button(onClick = onSave, enabled = !uiState.isSaving, modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp)) {
                    Text(if (uiState.isSaving) "Salvando..." else "Salvar treino")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ActivityTypeField(
    activityType: String,
    onActivityTypeChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }, modifier = modifier) {
        OutlinedTextField(
            value = activityType,
            onValueChange = {},
            readOnly = true,
            label = { Text("Modalidade") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            WorkoutActivityType.entries.forEach { activity ->
                DropdownMenuItem(text = { Text(activity.label) }, onClick = {
                    onActivityTypeChange(activity.label)
                    expanded = false
                })
            }
        }
    }
}

@Composable
private fun NumberField(label: String, value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        modifier = modifier,
    )
}

@Preview(showBackground = true)
@Composable
private fun AddWorkoutScreenPreview() {
    LajesFitTheme {
        AddWorkoutContent(
            uiState = AddWorkoutUiState(
                activityType = "Corrida",
                title = "Corrida no fim da tarde",
                performedAt = "09/07/2026 17:30",
                distanceKm = "5.2",
                calories = "410",
                hours = "",
                minutes = "31",
            ),
            onDone = {},
            onActivityTypeChange = {},
            onTitleChange = {},
            onPerformedAtChange = {},
            onDistanceChange = {},
            onCaloriesChange = {},
            onHoursChange = {},
            onMinutesChange = {},
            onPickPhoto = {},
            onSave = {},
        )
    }
}
