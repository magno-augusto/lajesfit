package com.lajesfit.android.feature.settings

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.lajesfit.android.ui.components.PlaceholderScreen
import com.lajesfit.android.ui.theme.LajesFitTheme

@Composable
fun SettingsScreen(
    modifier: Modifier = Modifier,
) {
    PlaceholderScreen(title = "Configuracoes", modifier = modifier)
}

@Preview(showBackground = true)
@Composable
private fun SettingsScreenPreview() {
    LajesFitTheme {
        SettingsScreen()
    }
}
