package com.lajesfit.android

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.lajesfit.android.feature.auth.AuthGateViewModel
import com.lajesfit.android.navigation.AuthRoutes
import com.lajesfit.android.navigation.BottomNavDestination
import com.lajesfit.android.navigation.LajesFitNavGraph
import com.lajesfit.android.navigation.PopOverRoutes
import com.lajesfit.android.ui.theme.LajesFitTheme
import dagger.hilt.android.AndroidEntryPoint
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.handleDeeplinks
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.auth.user.UserSession
import javax.inject.Inject

// Unica Activity do app (single-Activity, ver plano): hospeda o NavHost inteiro,
// incluindo as telas "pop over" — nenhuma outra tela e' uma Activity a parte,
// exceto a HealthPermissionRationaleActivity exigida pela Play Store (marco M5).
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var supabaseClient: SupabaseClient

    private var recoverySession by mutableStateOf<UserSession?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        handleAuthDeepLink(intent)
        setContent {
            LajesFitTheme {
                LajesFitAppRoot(
                    recoverySession = recoverySession,
                    onRecoveryHandled = { recoverySession = null },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleAuthDeepLink(intent)
    }

    // Deep link de recovery/signup-confirm/magic-link (ver AndroidManifest.xml). O tipo de fluxo
    // vem em UserSession.type - so o "recovery" precisa forcar ResetPasswordScreen; os demais
    // apenas atualizam sessionStatus e o NavGraph reage normalmente.
    private fun handleAuthDeepLink(intent: Intent) {
        supabaseClient.handleDeeplinks(intent) { session ->
            if (session.type == "recovery") {
                recoverySession = session
            }
        }
    }
}

@Composable
private fun LajesFitAppRoot(
    recoverySession: UserSession?,
    onRecoveryHandled: () -> Unit,
) {
    val authGateViewModel: AuthGateViewModel = hiltViewModel()
    val sessionStatus by authGateViewModel.sessionStatus.collectAsState()

    if (sessionStatus is SessionStatus.Initializing) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    // Decidido uma unica vez, na primeira composicao apos sair de Initializing (ver
    // android/specs/M1-supabase-auth.md) - transicoes durante a sessao (login, logout, recovery)
    // navegam explicitamente, nao recalculam o startDestination do NavHost.
    val startDestination = remember {
        val user = (sessionStatus as? SessionStatus.Authenticated)?.session?.user
        when {
            user != null && authGateViewModel.needsRealEmail(user) -> AuthRoutes.RequireEmail
            user != null -> BottomNavDestination.Feed.route
            else -> AuthRoutes.Login
        }
    }

    val navController = rememberNavController()

    LaunchedEffect(recoverySession) {
        if (recoverySession != null) {
            navController.navigate(AuthRoutes.ResetPassword) { launchSingleTop = true }
            onRecoveryHandled()
        }
    }

    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showChrome = currentRoute != null && currentRoute !in AuthRoutes.all

    Scaffold(
        bottomBar = { if (showChrome) LajesFitBottomBar(navController) },
        floatingActionButton = { if (showChrome) NewActionFab(navController) },
        floatingActionButtonPosition = FabPosition.Center,
    ) { contentPadding ->
        LajesFitNavGraph(
            navController = navController,
            startDestination = startDestination,
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
