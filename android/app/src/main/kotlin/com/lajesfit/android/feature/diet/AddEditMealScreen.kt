package com.lajesfit.android.feature.diet

import androidx.compose.runtime.Composable
import com.lajesfit.android.ui.components.PlaceholderScreen

// Equivalente a src/features/diet/AddFoodDialog.tsx; conteudo real (search_foods,
// upsert_catalog_food, BarcodeScannerScreen) chega no marco M4.
@Composable
fun AddEditMealScreen(onDone: () -> Unit) {
    PlaceholderScreen(title = "Nova refeicao", onClose = onDone)
}
