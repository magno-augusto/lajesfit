package com.lajesfit.android.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Espelha a bottom-nav do web (src/components/app-shell.tsx:128-234):
 * Feed / Dieta / [FAB central] / Treinos / Desafio.
 */
enum class BottomNavDestination(val route: String, val label: String, val icon: ImageVector) {
    Feed(route = "feed", label = "Feed", icon = Icons.Filled.Home),
    Diet(route = "diet", label = "Dieta", icon = Icons.Filled.Restaurant),
    Workouts(route = "workouts", label = "Treinos", icon = Icons.Filled.FitnessCenter),
    Challenges(route = "challenges", label = "Desafio", icon = Icons.Filled.EmojiEvents),
}

/**
 * Telas "pop over" abertas pelo FAB central (src/components/new-action-menu.tsx) — destinos
 * comuns do mesmo NavHost, nao Activities separadas (ver plano: decisao revisada).
 */
object PopOverRoutes {
    const val CreatePost = "post/create"
    const val AddMeal = "meal/add"
    const val AddWorkout = "workout/add"
}
