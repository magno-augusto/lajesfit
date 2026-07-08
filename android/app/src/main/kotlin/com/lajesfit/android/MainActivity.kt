package com.lajesfit.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FabPosition
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.lajesfit.android.navigation.BottomNavDestination
import com.lajesfit.android.navigation.LajesFitNavGraph
import com.lajesfit.android.navigation.PopOverRoutes
import com.lajesfit.android.ui.theme.LajesFitTheme

// Unica Activity do app (single-Activity, ver plano): hospeda o NavHost inteiro,
// incluindo as telas "pop over" — nenhuma outra tela e' uma Activity a parte,
// exceto a HealthPermissionRationaleActivity exigida pela Play Store (marco M5).
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            LajesFitTheme {
                LajesFitAppRoot()
            }
        }
    }
}

@Composable
private fun LajesFitAppRoot() {
    val navController = rememberNavController()

    Scaffold(
        bottomBar = { LajesFitBottomBar(navController) },
        floatingActionButton = { NewActionFab(navController) },
        floatingActionButtonPosition = FabPosition.Center,
    ) { contentPadding ->
        LajesFitNavGraph(
            navController = navController,
            modifier = Modifier.padding(contentPadding),
        )
    }
}

@Composable
private fun LajesFitBottomBar(navController: NavHostController) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.hierarchy?.firstOrNull { destination ->
        BottomNavDestination.entries.any { it.route == destination.route }
    }?.route

    NavigationBar {
        BottomNavDestination.entries.forEach { destination ->
            NavigationBarItem(
                selected = currentRoute == destination.route,
                onClick = {
                    navController.navigate(destination.route) {
                        popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                icon = { Icon(destination.icon, contentDescription = destination.label) },
                label = { Text(destination.label) },
            )
        }
    }
}

// Equivalente ao NewActionMenu do web (src/components/new-action-menu.tsx):
// Post no feed / Refeicao / Treino, cada um navegando para a rota "pop over" correspondente.
@Composable
private fun NewActionFab(navController: NavHostController) {
    var expanded by remember { mutableStateOf(false) }

    Box {
        FloatingActionButton(onClick = { expanded = true }) {
            Icon(Icons.Filled.Add, contentDescription = "Criar novo registro")
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(
                text = { Text("Post no feed") },
                onClick = {
                    expanded = false
                    navController.navigate(PopOverRoutes.CreatePost)
                },
            )
            DropdownMenuItem(
                text = { Text("Refeicao") },
                onClick = {
                    expanded = false
                    navController.navigate(PopOverRoutes.AddMeal)
                },
            )
            DropdownMenuItem(
                text = { Text("Treino") },
                onClick = {
                    expanded = false
                    navController.navigate(PopOverRoutes.AddWorkout)
                },
            )
        }
    }
}
