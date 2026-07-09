package com.lajesfit.android.feature.diet

import android.content.ContentResolver
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.ByteArrayOutputStream
import kotlin.math.roundToInt

fun compressMealPhoto(contentResolver: ContentResolver, uri: Uri): ByteArray? {
    val original = contentResolver.openInputStream(uri)?.use { input ->
        BitmapFactory.decodeStream(input)
    } ?: return null

    val longestSide = maxOf(original.width, original.height)
    val bitmap = if (longestSide > MAX_MEAL_PHOTO_SIDE) {
        val scale = MAX_MEAL_PHOTO_SIDE.toDouble() / longestSide.toDouble()
        Bitmap.createScaledBitmap(
            original,
            (original.width * scale).roundToInt(),
            (original.height * scale).roundToInt(),
            true,
        )
    } else {
        original
    }

    return ByteArrayOutputStream().use { output ->
        bitmap.compress(Bitmap.CompressFormat.JPEG, MEAL_PHOTO_JPEG_QUALITY, output)
        output.toByteArray()
    }
}

private const val MAX_MEAL_PHOTO_SIDE = 1400
private const val MEAL_PHOTO_JPEG_QUALITY = 82
