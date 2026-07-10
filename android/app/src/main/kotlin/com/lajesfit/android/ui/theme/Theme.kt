package com.lajesfit.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp

// Espelha o design system do web (../../src/styles.css): fundo quase-branco morno
// com cards brancos, primaria laranja e secundaria marrom-ambar. Sem verde/azul
// como acento — verde entra so em papel de "success".
private val LightColors = lightColorScheme(
    primary = LajesFitOrange,
    onPrimary = Color.White,
    primaryContainer = LajesFitAccent,
    onPrimaryContainer = LajesFitAccentInk,
    secondary = LajesFitAmber,
    onSecondary = Color.White,
    secondaryContainer = LajesFitAccent,
    onSecondaryContainer = LajesFitAccentInk,
    tertiary = LajesFitClay,
    onTertiary = Color.White,
    tertiaryContainer = LajesFitAccent,
    onTertiaryContainer = LajesFitAccentInk,
    background = LajesFitBackground,
    onBackground = LajesFitInk,
    surface = LajesFitBackground,
    onSurface = LajesFitInk,
    surfaceVariant = LajesFitMuted,
    onSurfaceVariant = LajesFitMutedInk,
    outline = LajesFitBorder,
    outlineVariant = LajesFitMuted,
    error = LajesFitDestructive,
    onError = Color.White,
    // cards brancos sobre fundo quase-branco, como no web
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color.White,
    surfaceContainer = Color(0xFFFBF8F3),
    surfaceContainerHigh = LajesFitSurfaceHigh,
    surfaceContainerHighest = LajesFitSurfaceHighest,
)

private val DarkColors = darkColorScheme(
    primary = LajesFitOrangeDark,
    onPrimary = LajesFitDarkBackground,
    primaryContainer = LajesFitAmberDark,
    onPrimaryContainer = Color(0xFFFFD9C1),
    secondary = LajesFitClayDark,
    onSecondary = LajesFitDarkBackground,
    secondaryContainer = LajesFitAmberDark,
    onSecondaryContainer = Color(0xFFF6E2CE),
    tertiary = LajesFitClayDark,
    onTertiary = LajesFitDarkBackground,
    tertiaryContainer = LajesFitAmberDark,
    onTertiaryContainer = Color(0xFFF6E2CE),
    background = LajesFitDarkBackground,
    onBackground = LajesFitDarkInk,
    surface = LajesFitDarkBackground,
    onSurface = LajesFitDarkInk,
    surfaceVariant = LajesFitDarkMuted,
    onSurfaceVariant = LajesFitDarkMutedInk,
    outline = LajesFitDarkBorder,
    outlineVariant = LajesFitDarkMuted,
    error = LajesFitDestructive,
    onError = Color.White,
    surfaceContainerLowest = Color(0xFF1A1410),
    surfaceContainerLow = LajesFitDarkCard,
    surfaceContainer = LajesFitDarkCard,
    surfaceContainerHigh = LajesFitDarkSurfaceHigh,
    surfaceContainerHighest = LajesFitDarkSurfaceHighest,
)

// Cantos mais arredondados, alinhados ao web (--radius 0.875rem ≈ 14px; cards
// rounded-xl ≈ 18px). O tema atual parava em 8-12px.
private val LajesFitShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(26.dp),
)

@Composable
fun LajesFitTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = LajesFitTypography,
        shapes = LajesFitShapes,
        content = content,
    )
}
