package com.lajesfit.android.feature.feed

import java.time.Duration
import java.time.Instant
import java.time.ZoneId

/** Porta format.ts:timeAgo para Kotlin - ver android/specs/M3-feed.md. */
fun timeAgo(createdAt: String): String {
    val then = try {
        Instant.parse(createdAt)
    } catch (e: Exception) {
        return ""
    }
    val seconds = Duration.between(then, Instant.now()).seconds
    return when {
        seconds < 60 -> "agora"
        seconds < 3_600 -> "${seconds / 60}min"
        seconds < 86_400 -> "${seconds / 3_600}h"
        seconds < 604_800 -> "${seconds / 86_400}d"
        else -> {
            val zoned = then.atZone(ZoneId.systemDefault())
            "%02d/%02d/%04d".format(zoned.dayOfMonth, zoned.monthValue, zoned.year)
        }
    }
}
