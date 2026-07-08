package com.lajesfit.android.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.lajesfit.android.feature.auth.AuthGateViewModel
import com.lajesfit.android.feature.auth.ForgotPasswordScreen
import com.lajesfit.android.feature.auth.LoginScreen
import com.lajesfit.android.feature.auth.RequireEmailScreen
import com.lajesfit.android.feature.auth.ResetPasswordScreen
import com.lajesfit.android.feature.auth.SignUpScreen
import com.lajesfit.android.feature.challenges.ChallengesScreen
import com.lajesfit.android.feature.diet.AddEditMealScreen
import com.lajesfit.android.feature.diet.DietScreen
import com.lajesfit.android.feature.feed.CreatePostScreen
import com.lajesfit.android.feature.feed.FeedScreen
import com.lajesfit.android.feature.workouts.AddWorkoutScreen
import com.lajesfit.android.feature.workouts.WorkoutsScreen

@Composable
fun LajesFitNavGraph(
    navController: NavHostController,
    startDestination: String,
    modifier: Modifier = Modifier,
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier,
    ) {
        composable(BottomNavDestination.Feed.route) { FeedScreen() }
        composable(BottomNavDestination.Diet.route) { DietScreen() }
        composable(BottomNavDestination.Workouts.route) { WorkoutsScreen() }
        composable(BottomNavDestination.Challenges.route) { ChallengesScreen() }

        // Telas "pop over": destinos do mesmo NavHost, resultado devolvido via
        // NavBackStackEntry.savedStateHandle quando a logica real chegar (M3/M4/M5).
        composable(PopOverRoutes.CreatePost) {
            CreatePostScreen(onDone = { navController.popBackStack() })
        }
        composable(PopOverRoutes.AddMeal) {
            AddEditMealScreen(onDone = { navController.popBackStack() })
        }
        composable(PopOverRoutes.AddWorkout) {
            AddWorkoutScreen(onDone = { navController.popBackStack() })
        }

        // Grafo raiz nao-autenticado (M1) - mesmo NavHost, ver android/specs/M1-supabase-auth.md.
        composable(AuthRoutes.Login) {
            val authGateViewModel: AuthGateViewModel = hiltViewModel()
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(postLoginDestination(authGateViewModel)) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onNavigateToSignUp = { navController.navigate(AuthRoutes.SignUp) },
                onNavigateToForgotPassword = { navController.navigate(AuthRoutes.ForgotPassword) },
            )
        }
        composable(AuthRoutes.SignUp) {
            SignUpScreen(
                onSignedUp = {
                    navController.navigate(AuthRoutes.Login) { popUpTo(AuthRoutes.SignUp) { inclusive = true } }
                },
                onNavigateToLogin = { navController.popBackStack() },
            )
        }
        composable(AuthRoutes.ForgotPassword) {
            ForgotPasswordScreen(onNavigateToLogin = { navController.popBackStack() })
        }
        composable(AuthRoutes.ResetPassword) {
            val authGateViewModel: AuthGateViewModel = hiltViewModel()
            ResetPasswordScreen(
                onDone = {
                    navController.navigate(postLoginDestination(authGateViewModel)) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }
        composable(AuthRoutes.RequireEmail) {
            RequireEmailScreen(
                onSkip = {
                    navController.navigate(BottomNavDestination.Feed.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onLoggedOut = {
                    navController.navigate(AuthRoutes.Login) { popUpTo(0) { inclusive = true } }
                },
            )
        }
    }
}

/** Depois de login/recovery: Feed direto, ou RequireEmail se a conta ainda for legada. */
private fun postLoginDestination(authGateViewModel: AuthGateViewModel): String {
    val user = authGateViewModel.currentUser()
    return if (user != null && authGateViewModel.needsRealEmail(user)) {
        AuthRoutes.RequireEmail
    } else {
        BottomNavDestination.Feed.route
    }
}
