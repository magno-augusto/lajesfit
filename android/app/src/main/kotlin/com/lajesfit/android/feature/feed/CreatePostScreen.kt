package com.lajesfit.android.feature.feed

import androidx.compose.runtime.Composable
import com.lajesfit.android.ui.components.PlaceholderScreen

// Equivalente a src/features/feed/CreatePostDialog.tsx; conteudo real chega no marco M3.
@Composable
fun CreatePostScreen(onDone: () -> Unit) {
    PlaceholderScreen(title = "Novo post", onClose = onDone)
}
