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
    const val AddMeal = "meal/add?meal={meal}&date={date}"
    const val BarcodeScanner = "diet/scanner"
    const val AddWorkout = "workout/add"
    const val Comments = "post/{postId}/comments"

    fun addMealRoute(meal: String? = null, date: String? = null): String {
        val params = listOfNotNull(
            meal?.let { "meal=$it" },
            date?.let { "date=$it" },
        )
        return if (params.isEmpty()) "meal/add" else "meal/add?${params.joinToString("&")}"
    }
    fun commentsRoute(postId: String) = "post/$postId/comments"
}

/**
 * Grafo raiz nao-autenticado (M1) - mesmo NavHost do M0, nao uma Activity/grafo separado (ver
 * android/specs/M1-supabase-auth.md). MainActivity escolhe o startDestination uma unica vez, a
 * partir da sessao atual; transicoes durante a sessao (login bem-sucedido, logout, deep link de
 * recovery) navegam explicitamente entre estas rotas e o grafo principal.
 */
object AuthRoutes {
    const val Login = "auth/login"
    const val SignUp = "auth/signup"
    const val ForgotPassword = "auth/forgot-password"
    const val ResetPassword = "auth/reset-password"
    const val RequireEmail = "auth/require-email"
    const val Setup = "auth/setup"

    val all = setOf(Login, SignUp, ForgotPassword, ResetPassword, RequireEmail, Setup)
}
