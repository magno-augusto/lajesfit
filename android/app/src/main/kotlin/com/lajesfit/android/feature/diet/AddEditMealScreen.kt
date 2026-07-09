package com.lajesfit.android.feature.diet

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.lajesfit.android.ui.theme.LajesFitTheme
import kotlin.math.roundToInt

@Composable
fun AddEditMealScreen(
    onDone: () -> Unit,
    onOpenBarcodeScanner: () -> Unit,
    scannedFoodJson: String? = null,
    viewModel: AddEditMealViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val photoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        viewModel.onPhotoSelected(uri?.let { compressMealPhoto(context.contentResolver, it) })
    }
    LaunchedEffect(uiState.done) {
        if (uiState.done) onDone()
    }
    LaunchedEffect(scannedFoodJson) {
        scannedFoodJson?.let(viewModel::selectScannedFood)
    }
    AddEditMealContent(
        uiState = uiState,
        onDone = onDone,
        onOpenBarcodeScanner = onOpenBarcodeScanner,
        onPickPhoto = { photoLauncher.launch("image/*") },
        onQueryChange = viewModel::onQueryChange,
        onSelectFood = viewModel::selectFood,
        onSelectMeasure = viewModel::selectMeasure,
        onQuantityChange = viewModel::onQuantityChange,
        onAddSelectedFood = viewModel::addSelectedFood,
        onManualNameChange = viewModel::onManualNameChange,
        onManualBrandChange = viewModel::onManualBrandChange,
        onManualKcalChange = viewModel::onManualKcalChange,
        onManualProteinChange = viewModel::onManualProteinChange,
        onManualCarbsChange = viewModel::onManualCarbsChange,
        onManualFatChange = viewModel::onManualFatChange,
        onAddManualFood = viewModel::addManualFood,
        onRemoveItem = viewModel::removeSessionItem,
        onSave = viewModel::save,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddEditMealContent(
    uiState: AddEditMealUiState,
    onDone: () -> Unit,
    onOpenBarcodeScanner: () -> Unit,
    onPickPhoto: () -> Unit,
    onQueryChange: (String) -> Unit,
    onSelectFood: (TacoFood) -> Unit,
    onSelectMeasure: (FoodMeasure?) -> Unit,
    onQuantityChange: (String) -> Unit,
    onAddSelectedFood: () -> Unit,
    onManualNameChange: (String) -> Unit,
    onManualBrandChange: (String) -> Unit,
    onManualKcalChange: (String) -> Unit,
    onManualProteinChange: (String) -> Unit,
    onManualCarbsChange: (String) -> Unit,
    onManualFatChange: (String) -> Unit,
    onAddManualFood: () -> Unit,
    onRemoveItem: (Int) -> Unit,
    onSave: () -> Unit,
) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground,
                ),
                title = { Text(uiState.meal.label) },
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
            contentPadding = PaddingValues(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = uiState.query,
                        onValueChange = onQueryChange,
                        label = { Text("Buscar alimento") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    IconButton(onClick = onOpenBarcodeScanner) {
                        Icon(
                            Icons.Filled.QrCodeScanner,
                            contentDescription = "Escanear codigo de barras",
                            tint = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }
            if (uiState.isSearching) {
                item {
                    Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.Center) {
                        CircularProgressIndicator()
                    }
                }
            }
            items(uiState.results, key = { it.id }) { food ->
                FoodResultRow(food = food, selected = food.id == uiState.selectedFood?.id, onClick = { onSelectFood(food) })
            }
            uiState.selectedFood?.let { food ->
                item {
                    SelectedFoodCard(
                        food = food,
                        selectedMeasure = uiState.selectedMeasure,
                        quantity = uiState.quantity,
                        onSelectMeasure = onSelectMeasure,
                        onQuantityChange = onQuantityChange,
                        onAdd = onAddSelectedFood,
                    )
                }
            }
            if (uiState.showManualForm) {
                item {
                    ManualFoodForm(
                        uiState = uiState,
                        onNameChange = onManualNameChange,
                        onBrandChange = onManualBrandChange,
                        onKcalChange = onManualKcalChange,
                        onProteinChange = onManualProteinChange,
                        onCarbsChange = onManualCarbsChange,
                        onFatChange = onManualFatChange,
                        onAdd = onAddManualFood,
                    )
                }
            }
            item {
                SessionItemsCard(uiState = uiState, onRemoveItem = onRemoveItem)
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
                Button(
                    onClick = onSave,
                    enabled = !uiState.isSaving,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (uiState.isSaving) "Salvando..." else "Salvar refeicao")
                }
            }
        }
    }
}

@Composable
private fun FoodResultRow(food: TacoFood, selected: Boolean, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.surfaceContainerLow
            },
        ),
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(food.name, style = MaterialTheme.typography.titleSmall)
            Text(
                listOfNotNull(food.brand, "${food.kcal.roundToInt()} kcal/100g").joinToString(" - "),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (selected) {
                Text(
                    "Selecionado",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SelectedFoodCard(
    food: TacoFood,
    selectedMeasure: FoodMeasure?,
    quantity: String,
    onSelectMeasure: (FoodMeasure?) -> Unit,
    onQuantityChange: (String) -> Unit,
    onAdd: () -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(food.name, style = MaterialTheme.typography.titleMedium)
            ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                OutlinedTextField(
                    value = selectedMeasure?.label ?: "Gramas",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Medida") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    DropdownMenuItem(text = { Text("Gramas") }, onClick = {
                        onSelectMeasure(null)
                        expanded = false
                    })
                    food.measures.forEach { measure ->
                        DropdownMenuItem(text = { Text("${measure.label} (${formatNumber(measure.grams)}g)") }, onClick = {
                            onSelectMeasure(measure)
                            expanded = false
                        })
                    }
                }
            }
            OutlinedTextField(
                value = quantity,
                onValueChange = onQuantityChange,
                label = { Text("Quantidade em gramas") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedButton(onClick = onAdd, modifier = Modifier.fillMaxWidth()) {
                Text("Adicionar item")
            }
        }
    }
}

@Composable
private fun ManualFoodForm(
    uiState: AddEditMealUiState,
    onNameChange: (String) -> Unit,
    onBrandChange: (String) -> Unit,
    onKcalChange: (String) -> Unit,
    onProteinChange: (String) -> Unit,
    onCarbsChange: (String) -> Unit,
    onFatChange: (String) -> Unit,
    onAdd: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Cadastrar alimento", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(uiState.manualName, onNameChange, label = { Text("Nome") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(uiState.manualBrand, onBrandChange, label = { Text("Marca") }, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MacroField("Kcal", uiState.manualKcal, onKcalChange, Modifier.weight(1f))
                MacroField("Prot.", uiState.manualProtein, onProteinChange, Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MacroField("Carbo", uiState.manualCarbs, onCarbsChange, Modifier.weight(1f))
                MacroField("Gord.", uiState.manualFat, onFatChange, Modifier.weight(1f))
            }
            OutlinedButton(onClick = onAdd, modifier = Modifier.fillMaxWidth()) {
                Text("Adicionar manual")
            }
        }
    }
}

@Composable
private fun MacroField(label: String, value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        modifier = modifier,
    )
}

@Composable
private fun SessionItemsCard(uiState: AddEditMealUiState, onRemoveItem: (Int) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Itens", style = MaterialTheme.typography.titleMedium)
            if (uiState.items.isEmpty()) {
                Text("Nenhum item adicionado", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                uiState.items.forEachIndexed { index, item ->
                    if (index > 0) HorizontalDivider()
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.name)
                            Text(
                                "${formatNumber(item.grams)}g - ${item.kcal.roundToInt()} kcal",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        IconButton(onClick = { onRemoveItem(index) }) {
                            Icon(Icons.Filled.Delete, contentDescription = "Remover")
                        }
                    }
                }
                HorizontalDivider()
                Text(
                    "Total: ${uiState.totalKcal} kcal - ${formatNumber(uiState.totalProtein)}P / " +
                        "${formatNumber(uiState.totalCarbs)}C / ${formatNumber(uiState.totalFat)}G",
                    style = MaterialTheme.typography.titleSmall,
                )
            }
        }
    }
}

private fun formatNumber(value: Double): String {
    return if (value % 1.0 == 0.0) value.roundToInt().toString() else "%.1f".format(value)
}

@Preview(showBackground = true)
@Composable
private fun AddEditMealScreenPreview() {
    LajesFitTheme {
        AddEditMealContent(
            uiState = AddEditMealUiState(
                meal = MealType.LUNCH,
                query = "arroz",
                results = listOf(
                    TacoFood(1, "taco", "1", "Arroz branco cozido", "Cereais", null, 128.0, 2.5, 28.1, 0.2, 1.6),
                ),
                items = listOf(MealFoodInput("Frango grelhado", 150.0, 240.0, 45.0, 0.0, 5.0)),
            ),
            onDone = {},
            onOpenBarcodeScanner = {},
            onPickPhoto = {},
            onQueryChange = {},
            onSelectFood = {},
            onSelectMeasure = {},
            onQuantityChange = {},
            onAddSelectedFood = {},
            onManualNameChange = {},
            onManualBrandChange = {},
            onManualKcalChange = {},
            onManualProteinChange = {},
            onManualCarbsChange = {},
            onManualFatChange = {},
            onAddManualFood = {},
            onRemoveItem = {},
            onSave = {},
        )
    }
}
