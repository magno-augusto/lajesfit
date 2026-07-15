package com.lajesfit.android.feature.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil3.compose.AsyncImage
import com.lajesfit.android.feature.feed.FeedPost
import com.lajesfit.android.feature.feed.PostCard
import com.lajesfit.android.feature.feed.PostType
import com.lajesfit.android.feature.feed.ProfileSummary
import com.lajesfit.android.ui.theme.BebasNeue
import com.lajesfit.android.ui.theme.LajesFitTheme

// Espelha src/features/profile/ProfilePage.tsx: card branco de cabecalho com
// avatar em anel primary/30, nome em Bebas e stats (Posts/Treinos/Seguidores/
// Seguindo) em Bebas, secoes "SOLICITACOES"/"PUBLICACOES" com titulo Bebas
// maiusculo e badge de contagem primary/10.

@Composable
fun ProfileScreen(
    onOpenSettings: () -> Unit,
    onOpenComments: (String) -> Unit,
    onOpenProfile: (String) -> Unit,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    ProfileScreenContent(
        uiState = uiState,
        onRefresh = viewModel::refresh,
        onOpenSettings = onOpenSettings,
        onFollowOrRequest = viewModel::followOrRequest,
        onCancelRequest = viewModel::cancelRequest,
        onUnfollow = viewModel::unfollow,
        onAcceptRequest = viewModel::acceptRequest,
        onDeclineRequest = viewModel::declineRequest,
        onLike = viewModel::toggleLike,
        onDeletePost = viewModel::deletePost,
        onOpenComments = onOpenComments,
        onOpenProfile = onOpenProfile,
    )
}

@Composable
private fun ProfileScreenContent(
    uiState: ProfileUiState,
    onRefresh: () -> Unit,
    onOpenSettings: () -> Unit,
    onFollowOrRequest: () -> Unit,
    onCancelRequest: () -> Unit,
    onUnfollow: () -> Unit,
    onAcceptRequest: (String) -> Unit,
    onDeclineRequest: (String) -> Unit,
    onLike: (FeedPost) -> Unit,
    onDeletePost: (String) -> Unit,
    onOpenComments: (String) -> Unit,
    onOpenProfile: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    when {
        uiState.isLoading -> {
            Column(
                modifier = modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                CircularProgressIndicator(modifier = Modifier.padding(bottom = 8.dp))
                Text("Carregando perfil...", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        uiState.profile == null -> {
            Column(
                modifier = modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(uiState.errorMessage ?: "Perfil nao encontrado", textAlign = TextAlign.Center)
                TextButton(onClick = onRefresh) {
                    Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                    Text("Tentar de novo")
                }
            }
        }
        else -> {
            LazyColumn(
                modifier = modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    ProfileHeaderCard(
                        profile = uiState.profile,
                        counts = uiState.counts,
                        isMe = uiState.isMe,
                        followStatus = uiState.followStatus,
                        isBusy = uiState.isBusy,
                        onOpenSettings = onOpenSettings,
                        onFollowOrRequest = onFollowOrRequest,
                        onCancelRequest = onCancelRequest,
                        onUnfollow = onUnfollow,
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                    )
                }

                if (uiState.isMe && uiState.profile.isPrivate) {
                    item {
                        IncomingRequestsCard(
                            requests = uiState.incomingRequests,
                            isBusy = uiState.isBusy,
                            onAccept = onAcceptRequest,
                            onDecline = onDeclineRequest,
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        )
                    }
                }

                uiState.errorMessage?.let { message ->
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        ) {
                            Text(message, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(14.dp))
                        }
                    }
                }

                item {
                    SectionHeading(text = "Publicacoes", modifier = Modifier.padding(horizontal = 16.dp))
                }

                when {
                    !uiState.canViewPosts -> {
                        item {
                            PrivateProfileCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp))
                        }
                    }
                    uiState.posts.isEmpty() -> {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                            ) {
                                Text(
                                    text = "Nenhuma publicacao ainda",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                                )
                            }
                        }
                    }
                    else -> {
                        items(uiState.posts, key = { it.id }) { post ->
                            PostCard(
                                post = post,
                                canDelete = uiState.currentUserId == post.userId,
                                onLike = { onLike(post) },
                                onDelete = { onDeletePost(post.id) },
                                onOpenComments = { onOpenComments(post.id) },
                                onOpenProfile = { onOpenProfile(post.profile.username) },
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionHeading(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text.uppercase(),
        fontFamily = BebasNeue,
        fontSize = 22.sp,
        modifier = modifier,
    )
}

@Composable
private fun ProfileHeaderCard(
    profile: UserProfile,
    counts: ProfileCounts,
    isMe: Boolean,
    followStatus: FollowStatus,
    isBusy: Boolean,
    onOpenSettings: () -> Unit,
    onFollowOrRequest: () -> Unit,
    onCancelRequest: () -> Unit,
    onUnfollow: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                ProfileAvatar(
                    profile.avatarUrl,
                    profile.displayName,
                    modifier = Modifier
                        .size(72.dp)
                        .border(3.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f), CircleShape)
                        .padding(3.dp),
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(profile.displayName, fontFamily = BebasNeue, fontSize = 28.sp)
                    Text(
                        text = "@${profile.username}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (isMe) {
                    IconButton(onClick = onOpenSettings) {
                        Icon(
                            Icons.Filled.Settings,
                            contentDescription = "Configuracoes",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            if (!profile.bio.isNullOrBlank()) {
                Text(profile.bio, style = MaterialTheme.typography.bodyMedium)
            }

            if (!isMe) {
                FollowButton(
                    status = followStatus,
                    isPrivate = profile.isPrivate,
                    isBusy = isBusy,
                    onFollowOrRequest = onFollowOrRequest,
                    onCancelRequest = onCancelRequest,
                    onUnfollow = onUnfollow,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                ProfileStat("Posts", counts.posts, modifier = Modifier.weight(1f))
                ProfileStat("Treinos", counts.workouts, modifier = Modifier.weight(1f))
                ProfileStat("Seguidores", counts.followers, modifier = Modifier.weight(1f))
                ProfileStat("Seguindo", counts.following, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun FollowButton(
    status: FollowStatus,
    isPrivate: Boolean,
    isBusy: Boolean,
    onFollowOrRequest: () -> Unit,
    onCancelRequest: () -> Unit,
    onUnfollow: () -> Unit,
    modifier: Modifier = Modifier,
) {
    when (status) {
        FollowStatus.FOLLOWING -> {
            OutlinedButton(onClick = onUnfollow, enabled = !isBusy, modifier = modifier) {
                Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                Text("Seguindo")
            }
        }
        FollowStatus.REQUESTED -> {
            Button(
                onClick = onCancelRequest,
                enabled = !isBusy,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                modifier = modifier,
            ) {
                Icon(Icons.Filled.Schedule, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                Text("Solicitado")
            }
        }
        FollowStatus.NONE -> {
            Button(onClick = onFollowOrRequest, enabled = !isBusy, modifier = modifier) {
                Icon(Icons.Filled.PersonAdd, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                Text(if (isPrivate) "Solicitar" else "Seguir")
            }
        }
    }
}

@Composable
private fun IncomingRequestsCard(
    requests: List<IncomingFollowRequest>,
    isBusy: Boolean,
    onAccept: (String) -> Unit,
    onDecline: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    SectionHeading(text = "Solicitacoes")
                    Text(
                        text = "Aprove quem pode ver suas publicacoes.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (requests.isNotEmpty()) {
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                    ) {
                        Text(
                            text = requests.size.toString(),
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        )
                    }
                }
            }

            if (requests.isEmpty()) {
                Text(
                    text = "Nenhuma solicitacao pendente",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    textAlign = TextAlign.Center,
                )
            } else {
                requests.forEachIndexed { index, request ->
                    if (index > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        ProfileAvatar(request.profile.avatarUrl, request.profile.displayName, modifier = Modifier.size(40.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(request.profile.displayName, style = MaterialTheme.typography.bodyMedium)
                            Text(
                                "@${request.profile.username}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        IconButton(onClick = { onAccept(request.requesterId) }, enabled = !isBusy) {
                            Icon(Icons.Filled.Check, contentDescription = "Aceitar solicitacao")
                        }
                        IconButton(onClick = { onDecline(request.requesterId) }, enabled = !isBusy) {
                            Icon(Icons.Filled.Close, contentDescription = "Recusar solicitacao")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileAvatar(avatarUrl: String?, fallbackName: String, modifier: Modifier = Modifier) {
    if (avatarUrl != null) {
        AsyncImage(
            model = avatarUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = modifier.clip(CircleShape),
        )
    } else {
        Box(
            modifier = modifier.clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                fallbackName.take(1).uppercase(),
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}

@Composable
private fun ProfileStat(label: String, value: Int, modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = value.toString(), fontFamily = BebasNeue, fontSize = 22.sp)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun PrivateProfileCard(modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Filled.Lock,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp),
                )
            }
            Text("Perfil privado", style = MaterialTheme.typography.titleMedium)
            Text(
                text = "Solicite para seguir e ver as publicacoes deste perfil.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ProfileScreenPreview() {
    LajesFitTheme {
        ProfileScreenContent(
            uiState = ProfileUiState(
                currentUserId = "u1",
                profile = UserProfile(
                    id = "u1",
                    username = "magno",
                    displayName = "Magno",
                    avatarUrl = null,
                    bio = "Treinos, dieta e consistencia.",
                    isPrivate = false,
                ),
                counts = ProfileCounts(posts = 8, workouts = 14, followers = 22, following = 7),
                posts = listOf(
                    FeedPost(
                        id = "p1",
                        content = "Treino de hoje foi puxado.",
                        mediaUrl = null,
                        createdAt = "2026-07-09T12:00:00Z",
                        userId = "u1",
                        workoutId = null,
                        profile = ProfileSummary("u1", "magno", "Magno", null),
                        workout = null,
                        likesCount = 3,
                        commentsCount = 1,
                        likedByMe = false,
                        type = PostType.GENERAL,
                    ),
                ),
                isLoading = false,
            ),
            onRefresh = {},
            onOpenSettings = {},
            onFollowOrRequest = {},
            onCancelRequest = {},
            onUnfollow = {},
            onAcceptRequest = {},
            onDeclineRequest = {},
            onLike = {},
            onDeletePost = {},
            onOpenComments = {},
            onOpenProfile = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun PrivateProfileScreenPreview() {
    LajesFitTheme {
        ProfileScreenContent(
            uiState = ProfileUiState(
                currentUserId = "u1",
                profile = UserProfile(
                    id = "u2",
                    username = "ana",
                    displayName = "Ana",
                    avatarUrl = null,
                    bio = null,
                    isPrivate = true,
                ),
                isLoading = false,
            ),
            onRefresh = {},
            onOpenSettings = {},
            onFollowOrRequest = {},
            onCancelRequest = {},
            onUnfollow = {},
            onAcceptRequest = {},
            onDeclineRequest = {},
            onLike = {},
            onDeletePost = {},
            onOpenComments = {},
            onOpenProfile = {},
        )
    }
}
