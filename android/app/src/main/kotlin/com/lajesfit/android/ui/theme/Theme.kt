package com.lajesfit.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = LajesFitOrange,
    onPrimary = Color.White,
    background = LajesFitCream,
    surface = LajesFitCream,
)

private val DarkColors = darkColorScheme(
    primary = LajesFitOrangeDark,
    onPrimary = Color.Black,
    background = LajesFitSurfaceDark,
    surface = LajesFitSurfaceDark,
)

@Composable
fun LajesFitTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = LajesFitTypography,
        content = content,
    )
}
