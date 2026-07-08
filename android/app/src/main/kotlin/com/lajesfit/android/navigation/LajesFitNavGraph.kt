package com.lajesfit.android.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.lajesfit.android.feature.challenges.ChallengesScreen
import com.lajesfit.android.feature.diet.AddEditMealScreen
import com.lajesfit.android.feature.diet.DietScreen
import com.lajesfit.android.feature.feed.CreatePostScreen
import com.lajesfit.android.feature.feed.FeedScreen
import com.lajesfit.android.feature.workouts.AddWorkoutScreen
import com.lajesfit.android.feature.workouts.WorkoutsScreen

@Composable
fun LajesFitNavGraph(navController: NavHostController, modifier: Modifier = Modifier) {
    NavHost(
        navController = navController,
        startDestination = BottomNavDestination.Feed.route,
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
    }
}
