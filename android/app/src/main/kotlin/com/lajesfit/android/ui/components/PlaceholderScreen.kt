package com.lajesfit.android.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.lajesfit.android.ui.theme.LajesFitTheme

/**
 * Esqueleto compartilhado pelas telas ainda nao implementadas (M0). Telas de aba (sem [onClose])
 * mostram so o titulo central; telas "pop over" (com [onClose]) ganham uma barra com botao de
 * fechar, ja testavel de ponta a ponta mesmo antes de ter conteudo real.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlaceholderScreen(
    title: String,
    modifier: Modifier = Modifier,
    onClose: (() -> Unit)? = null,
) {
    Scaffold(
        modifier = modifier,
        topBar = {
            if (onClose != null) {
                TopAppBar(
                    title = { Text(title) },
                    navigationIcon = {
                        IconButton(onClick = onClose) {
                            Icon(Icons.Filled.Close, contentDescription = "Fechar")
                        }
                    },
                )
            }
        },
    ) { contentPadding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(contentPadding).padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (onClose == null) {
                Text(text = title, style = MaterialTheme.typography.titleLarge)
            }
            Text(text = "Em construcao", style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun PlaceholderScreenTabPreview() {
    LajesFitTheme { PlaceholderScreen(title = "Feed") }
}

@Preview(showBackground = true)
@Composable
private fun PlaceholderScreenPopOverPreview() {
    LajesFitTheme { PlaceholderScreen(title = "Novo post", onClose = {}) }
}
