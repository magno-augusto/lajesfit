package com.lajesfit.android.feature.workouts

import androidx.compose.runtime.Composable
import com.lajesfit.android.ui.components.PlaceholderScreen

// Equivalente a src/features/workouts/ManualWorkoutDialog.tsx; conteudo real chega no marco M5.
@Composable
fun AddWorkoutScreen(onDone: () -> Unit) {
    PlaceholderScreen(title = "Novo treino", onClose = onDone)
}
