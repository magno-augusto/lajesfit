package com.lajesfit.android

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Article
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import coil3.compose.AsyncImage
import com.lajesfit.android.feature.auth.AuthGateViewModel
import com.lajesfit.android.feature.auth.GateState
import com.lajesfit.android.feature.profile.ProfileChromeSummary
import com.lajesfit.android.feature.profile.ProfileChromeViewModel
import com.lajesfit.android.navigation.AuthRoutes
import com.lajesfit.android.navigation.BottomNavDestination
import com.lajesfit.android.navigation.LajesFitNavGraph
import com.lajesfit.android.navigation.PopOverRoutes
import com.lajesfit.android.navigation.ProfileRoutes
import com.lajesfit.android.ui.theme.LajesFitTheme
import dagger.hilt.android.AndroidEntryPoint
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.handleDeeplinks
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
        // Named arg de proposito: handleDeeplinks(intent, onSessionSuccess, onError) tem 2
        // parametros de funcao - uma lambda trailing sem nome se ligaria ao ultimo (onError).
        supabaseClient.handleDeeplinks(
            intent = intent,
            onSessionSuccess = { session ->
                if (session.type == "recovery") {
                    recoverySession = session
                }
            },
        )
    }
}

@Composable
private fun LajesFitAppRoot(
    recoverySession: UserSession?,
    onRecoveryHandled: () -> Unit,
) {
    val authGateViewModel: AuthGateViewModel = hiltViewModel()
    val gateState by authGateViewModel.gateState.collectAsState()

    if (gateState is GateState.Loading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    // Decidido uma unica vez, na primeira composicao apos sair de Loading (ver
    // android/specs/M2-onboarding.md) - transicoes durante a sessao (login, logout, recovery,
    // onboarding concluido) navegam explicitamente, nao recalculam o startDestination do NavHost.
    val startDestination = remember {
        when (gateState) {
            GateState.NeedsRealEmail -> AuthRoutes.RequireEmail
            GateState.NeedsOnboarding -> AuthRoutes.Setup
            GateState.Ready -> BottomNavDestination.Feed.route
            GateState.Unauthenticated -> AuthRoutes.Login
            GateState.Loading -> error("GateState.Loading ja foi tratado acima")
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
    val showTopBar = currentRoute?.let(::isAuthenticatedTopBarRoute) == true

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = { if (showTopBar) LajesFitTopBar(navController) },
        bottomBar = { if (showChrome) LajesFitBottomBar(navController) },
    ) { contentPadding ->
        LajesFitNavGraph(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(contentPadding),
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LajesFitTopBar(
    navController: NavHostController,
    viewModel: ProfileChromeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val profile = uiState.profile

    TopAppBar(
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.background,
            titleContentColor = MaterialTheme.colorScheme.onBackground,
            actionIconContentColor = MaterialTheme.colorScheme.onSurfaceVariant,
        ),
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    color = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    shape = CircleShape,
                    modifier = Modifier.size(34.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text("LF", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text("LajesFit", style = MaterialTheme.typography.displaySmall)
            }
        },
        actions = {
            IconButton(
                onClick = {
                    navController.navigate(ProfileRoutes.Search) { launchSingleTop = true }
                },
            ) {
                Icon(Icons.Filled.Search, contentDescription = "Buscar pessoas")
            }
            ProfileAvatarAction(
                profile = profile,
                onClick = {
                    if (profile != null) {
                        navController.navigate(ProfileRoutes.profileRoute(profile.username)) {
                            launchSingleTop = true
                        }
                    }
                },
            )
        },
    )
}

@Composable
private fun ProfileAvatarAction(
    profile: ProfileChromeSummary?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    IconButton(onClick = onClick, enabled = profile != null, modifier = modifier) {
        val avatarUrl = profile?.avatarUrl
        when {
            avatarUrl != null -> {
                AsyncImage(
                    model = avatarUrl,
                    contentDescription = "Abrir perfil",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(34.dp)
                        .clip(CircleShape)
                        .border(BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.35f)), CircleShape),
                )
            }
            profile != null -> {
                Box(
                    modifier = Modifier.size(32.dp).clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center,
                ) {
                    val label = profile.displayName?.takeIf { it.isNotBlank() } ?: profile.username
                    Text(
                        text = label.take(1).uppercase(),
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
            else -> Icon(Icons.Filled.AccountCircle, contentDescription = "Abrir perfil")
        }
    }
}

@Composable
private fun LajesFitBottomBar(navController: NavHostController) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.hierarchy?.firstOrNull { destination ->
        BottomNavDestination.entries.any { it.route == destination.route }
    }?.route

    // O botao "novo" pertence a nav: ocupa o slot central (entre Dieta e Treinos) com o topo
    // levemente saltado para fora da barra.
    Box {
        NavigationBar(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
            tonalElevation = 8.dp,
        ) {
            BottomNavDestination.entries.forEachIndexed { index, destination ->
                if (index == 2) {
                    Spacer(modifier = Modifier.weight(1f))
                }
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
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                        selectedTextColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                        unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    ),
                )
            }
        }
        NewActionFab(
            navController = navController,
            modifier = Modifier.align(Alignment.TopCenter).offset(y = (-14).dp),
        )
    }
}

private fun isAuthenticatedTopBarRoute(route: String): Boolean =
    BottomNavDestination.entries.any { it.route == route } || route in ProfileRoutes.all

// Equivalente ao NewActionMenu do web (src/components/new-action-menu.tsx):
// Post no feed / Refeicao / Treino, cada um navegando para a rota "pop over" correspondente.
@Composable
private fun NewActionFab(navController: NavHostController, modifier: Modifier = Modifier) {
    var expanded by remember { mutableStateOf(false) }

    Box(modifier = modifier) {
        FloatingActionButton(
            onClick = { expanded = true },
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
            shape = CircleShape,
        ) {
            Icon(Icons.Filled.Add, contentDescription = "Criar novo registro")
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(
                text = { Text("Post no feed") },
                leadingIcon = { Icon(Icons.Filled.Article, contentDescription = null) },
                onClick = {
                    expanded = false
                    navController.navigate(PopOverRoutes.CreatePost)
                },
            )
            DropdownMenuItem(
                text = { Text("Refeicao") },
                leadingIcon = { Icon(Icons.Filled.Restaurant, contentDescription = null) },
                onClick = {
                    expanded = false
                    navController.navigate(PopOverRoutes.addMealRoute())
                },
            )
            DropdownMenuItem(
                text = { Text("Treino") },
                leadingIcon = { Icon(Icons.Filled.FitnessCenter, contentDescription = null) },
                onClick = {
                    expanded = false
                    navController.navigate(PopOverRoutes.addWorkoutRoute())
                },
            )
        }
    }
}
