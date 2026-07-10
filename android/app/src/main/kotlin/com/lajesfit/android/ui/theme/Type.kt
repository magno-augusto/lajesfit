package com.lajesfit.android.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.lajesfit.android.R

// Fonte display do web (.font-display): "Bebas Neue" condensada. Fica so nos
// estilos display* (marca/wordmark), como o web usa .font-display com
// parcimonia — headline/title/body seguem sans para nao virar caixa-alta.
val BebasNeue = FontFamily(Font(R.font.bebas_neue))

private val BaseTypography = Typography()

val LajesFitTypography = Typography(
    displayLarge = BaseTypography.displayLarge.copy(
        fontFamily = BebasNeue,
        fontWeight = FontWeight.Normal,
        fontSize = 57.sp,
        letterSpacing = 0.5.sp,
    ),
    displayMedium = BaseTypography.displayMedium.copy(
        fontFamily = BebasNeue,
        fontWeight = FontWeight.Normal,
        fontSize = 44.sp,
        letterSpacing = 0.5.sp,
    ),
    displaySmall = BaseTypography.displaySmall.copy(
        fontFamily = BebasNeue,
        fontWeight = FontWeight.Normal,
        fontSize = 30.sp,
        letterSpacing = 0.5.sp,
    ),
    headlineMedium = BaseTypography.headlineMedium.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        letterSpacing = 0.sp,
        lineHeight = 34.sp,
    ),
    headlineSmall = BaseTypography.headlineSmall.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 0.sp,
        lineHeight = 30.sp,
    ),
    titleLarge = BaseTypography.titleLarge.copy(
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 0.sp,
    ),
    titleMedium = BaseTypography.titleMedium.copy(
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 0.sp,
    ),
    titleSmall = BaseTypography.titleSmall.copy(
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 0.sp,
    ),
    bodyLarge = BaseTypography.bodyLarge.copy(letterSpacing = 0.sp, lineHeight = 24.sp),
    bodyMedium = BaseTypography.bodyMedium.copy(letterSpacing = 0.sp, lineHeight = 21.sp),
    bodySmall = BaseTypography.bodySmall.copy(letterSpacing = 0.sp, lineHeight = 18.sp),
    labelLarge = BaseTypography.labelLarge.copy(fontWeight = FontWeight.SemiBold, letterSpacing = 0.sp),
    labelMedium = BaseTypography.labelMedium.copy(fontWeight = FontWeight.SemiBold, letterSpacing = 0.sp),
    labelSmall = BaseTypography.labelSmall.copy(letterSpacing = 0.sp),
)
