package com.lajesfit.android.feature.profile

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.lajesfit.android.ui.components.PlaceholderScreen
import com.lajesfit.android.ui.theme.LajesFitTheme

@Composable
fun SearchProfilesScreen(
    onOpenProfile: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    PlaceholderScreen(title = "Busca", modifier = modifier)
}

@Preview(showBackground = true)
@Composable
private fun SearchProfilesScreenPreview() {
    LajesFitTheme {
        SearchProfilesScreen(onOpenProfile = {})
    }
}
