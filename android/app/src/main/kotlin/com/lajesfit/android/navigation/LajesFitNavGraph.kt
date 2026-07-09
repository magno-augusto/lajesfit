package com.lajesfit.android.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.lajesfit.android.feature.auth.AuthGateViewModel
import com.lajesfit.android.feature.auth.ForgotPasswordScreen
import com.lajesfit.android.feature.auth.LoginScreen
import com.lajesfit.android.feature.auth.RequireEmailScreen
import com.lajesfit.android.feature.auth.ResetPasswordScreen
import com.lajesfit.android.feature.auth.SignUpScreen
import com.lajesfit.android.feature.challenges.ChallengesScreen
import com.lajesfit.android.feature.diet.AddEditMealScreen
import com.lajesfit.android.feature.diet.BarcodeScannerScreen
import com.lajesfit.android.feature.diet.DietScreen
import com.lajesfit.android.feature.feed.CommentsScreen
import com.lajesfit.android.feature.feed.CreatePostScreen
import com.lajesfit.android.feature.feed.FeedScreen
import com.lajesfit.android.feature.feed.FeedViewModel
import com.lajesfit.android.feature.goals.SetupScreen
import com.lajesfit.android.feature.profile.ProfileScreen
import com.lajesfit.android.feature.profile.SearchProfilesScreen
import com.lajesfit.android.feature.settings.SettingsScreen
import com.lajesfit.android.feature.workouts.AddWorkoutScreen
import com.lajesfit.android.feature.workouts.WorkoutsViewModel
import com.lajesfit.android.feature.workouts.WorkoutsScreen
import kotlinx.coroutines.launch

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
        composable(BottomNavDestination.Feed.route) {
            FeedScreen(
                onOpenComments = { postId -> navController.navigate(PopOverRoutes.commentsRoute(postId)) },
                onOpenProfile = { username -> navController.navigate(ProfileRoutes.profileRoute(username)) },
            )
        }
        composable(BottomNavDestination.Diet.route) {
            DietScreen(
                onAddMeal = { meal, date -> navController.navigate(PopOverRoutes.addMealRoute(meal.value, date.toString())) },
            )
        }
        composable(BottomNavDestination.Workouts.route) {
            WorkoutsScreen(
                onAddWorkout = { navController.navigate(PopOverRoutes.addWorkoutRoute()) },
                onEditWorkout = { workoutId -> navController.navigate(PopOverRoutes.addWorkoutRoute(workoutId)) },
            )
        }
        composable(BottomNavDestination.Challenges.route) { ChallengesScreen() }

        composable(ProfileRoutes.Search) {
            SearchProfilesScreen(
                onOpenProfile = { username -> navController.navigate(ProfileRoutes.profileRoute(username)) },
            )
        }
        composable(ProfileRoutes.Settings) {
            SettingsScreen(
                onLoggedOut = {
                    navController.navigate(AuthRoutes.Login) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }
        composable(
            route = ProfileRoutes.Profile,
            arguments = listOf(navArgument(ProfileRoutes.UsernameArg) { type = NavType.StringType }),
        ) { backStackEntry ->
            ProfileScreen(
                onOpenSettings = { navController.navigate(ProfileRoutes.Settings) },
                onOpenComments = { postId -> navController.navigate(PopOverRoutes.commentsRoute(postId)) },
                onOpenProfile = { username -> navController.navigate(ProfileRoutes.profileRoute(username)) },
            )
        }

        // Telas "pop over": destinos do mesmo NavHost, resultado devolvido via
        // NavBackStackEntry.savedStateHandle quando a logica real chegar (M3/M4/M5).
        composable(PopOverRoutes.CreatePost) {
            CreatePostScreen(
                onDone = {
                    navController.previousBackStackEntry
                        ?.savedStateHandle
                        ?.set(FeedViewModel.REFRESH_KEY, true)
                    navController.popBackStack()
                },
            )
        }
        composable(
            route = PopOverRoutes.AddMeal,
            arguments = listOf(
                navArgument("meal") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
                navArgument("date") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
            ),
        ) {
            val scannedFoodJson = it.savedStateHandle.get<String>(SCANNED_FOOD_RESULT_KEY)
            AddEditMealScreen(
                onDone = { navController.popBackStack() },
                onOpenBarcodeScanner = { navController.navigate(PopOverRoutes.BarcodeScanner) },
                scannedFoodJson = scannedFoodJson,
            )
            it.savedStateHandle.remove<String>(SCANNED_FOOD_RESULT_KEY)
        }
        composable(PopOverRoutes.BarcodeScanner) {
            BarcodeScannerScreen(
                onDone = { navController.popBackStack() },
                onFoodFound = { foodJson ->
                    navController.previousBackStackEntry
                        ?.savedStateHandle
                        ?.set(SCANNED_FOOD_RESULT_KEY, foodJson)
                    navController.popBackStack()
                },
            )
        }
        composable(
            route = PopOverRoutes.AddWorkout,
            arguments = listOf(
                navArgument("workoutId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
            ),
        ) {
            AddWorkoutScreen(
                onDone = {
                    navController.previousBackStackEntry
                        ?.savedStateHandle
                        ?.set(WorkoutsViewModel.REFRESH_KEY, true)
                    navController.popBackStack()
                },
            )
        }
        composable(
            route = PopOverRoutes.Comments,
            arguments = listOf(navArgument("postId") { type = NavType.StringType }),
        ) {
            CommentsScreen(
                onDone = {
                    navController.previousBackStackEntry
                        ?.savedStateHandle
                        ?.set(FeedViewModel.REFRESH_KEY, true)
                    navController.popBackStack()
                },
            )
        }

        // Grafo raiz nao-autenticado (M1) - mesmo NavHost, ver android/specs/M1-supabase-auth.md.
        composable(AuthRoutes.Login) {
            val authGateViewModel: AuthGateViewModel = hiltViewModel()
            val scope = rememberCoroutineScope()
            LoginScreen(
                onLoginSuccess = {
                    scope.launch {
                        navController.navigate(postLoginDestination(authGateViewModel)) {
                            popUpTo(0) { inclusive = true }
                        }
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
            val scope = rememberCoroutineScope()
            ResetPasswordScreen(
                onDone = {
                    scope.launch {
                        navController.navigate(postLoginDestination(authGateViewModel)) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                },
            )
        }
        composable(AuthRoutes.RequireEmail) {
            val authGateViewModel: AuthGateViewModel = hiltViewModel()
            val scope = rememberCoroutineScope()
            RequireEmailScreen(
                onSkip = {
                    scope.launch {
                        val destination = if (authGateViewModel.hasIdrProfile()) {
                            BottomNavDestination.Feed.route
                        } else {
                            AuthRoutes.Setup
                        }
                        navController.navigate(destination) { popUpTo(0) { inclusive = true } }
                    }
                },
                onLoggedOut = {
                    navController.navigate(AuthRoutes.Login) { popUpTo(0) { inclusive = true } }
                },
            )
        }
        composable(AuthRoutes.Setup) {
            SetupScreen(
                onDone = {
                    navController.navigate(BottomNavDestination.Feed.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }
    }
}

private const val SCANNED_FOOD_RESULT_KEY = "diet_scanned_food"

/** Depois de login/recovery: RequireEmail p/ conta legada, Setup se falta o objetivo calorico,
 * senao Feed direto. */
private suspend fun postLoginDestination(authGateViewModel: AuthGateViewModel): String {
    val user = authGateViewModel.currentUser()
    return when {
        user != null && authGateViewModel.needsRealEmail(user) -> AuthRoutes.RequireEmail
        authGateViewModel.hasIdrProfile() -> BottomNavDestination.Feed.route
        else -> AuthRoutes.Setup
    }
}
