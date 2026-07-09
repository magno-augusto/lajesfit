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

private val LightColors = lightColorScheme(
    primary = LajesFitOrange,
    onPrimary = Color.White,
    primaryContainer = LajesFitCreamElevated,
    onPrimaryContainer = LajesFitClay,
    secondary = LajesFitGreen,
    onSecondary = Color.White,
    secondaryContainer = LajesFitGreenSoft,
    onSecondaryContainer = Color(0xFF163826),
    tertiary = LajesFitBlue,
    onTertiary = Color.White,
    tertiaryContainer = LajesFitBlueSoft,
    onTertiaryContainer = Color(0xFF132F42),
    background = LajesFitCreamSoft,
    onBackground = LajesFitInk,
    surface = LajesFitCreamSoft,
    onSurface = LajesFitInk,
    surfaceVariant = LajesFitCreamElevated,
    onSurfaceVariant = LajesFitMutedInk,
    outline = LajesFitOutline,
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color(0xFFFFF6EA),
    surfaceContainer = Color(0xFFFFF1DE),
    surfaceContainerHigh = Color(0xFFF8E6D5),
    surfaceContainerHighest = Color(0xFFF0DCCB),
)

private val DarkColors = darkColorScheme(
    primary = LajesFitOrangeDark,
    onPrimary = Color.Black,
    primaryContainer = Color(0xFF633819),
    onPrimaryContainer = Color(0xFFFFD9C1),
    secondary = LajesFitDarkGreen,
    onSecondary = Color(0xFF153724),
    secondaryContainer = Color(0xFF254B34),
    onSecondaryContainer = Color(0xFFD4F0DB),
    tertiary = Color(0xFFB8D4EA),
    onTertiary = Color(0xFF17354B),
    tertiaryContainer = Color(0xFF254B63),
    onTertiaryContainer = Color(0xFFD8ECFA),
    background = LajesFitDarkBackground,
    onBackground = Color(0xFFF4ECE5),
    surface = LajesFitDarkSurface,
    onSurface = Color(0xFFF4ECE5),
    surfaceVariant = LajesFitDarkSurfaceHigh,
    onSurfaceVariant = Color(0xFFD4C3B7),
    outline = Color(0xFF5B4E47),
    surfaceContainerLowest = Color(0xFF100E0D),
    surfaceContainerLow = LajesFitDarkSurface,
    surfaceContainer = Color(0xFF27221F),
    surfaceContainerHigh = LajesFitDarkSurfaceHigh,
    surfaceContainerHighest = Color(0xFF38312C),
)

private val LajesFitShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(6.dp),
    medium = RoundedCornerShape(8.dp),
    large = RoundedCornerShape(8.dp),
    extraLarge = RoundedCornerShape(12.dp),
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
