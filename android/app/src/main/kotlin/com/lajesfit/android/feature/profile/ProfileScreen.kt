package com.lajesfit.android.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil3.compose.AsyncImage
import com.lajesfit.android.feature.feed.FeedPost
import com.lajesfit.android.feature.feed.PostCard
import com.lajesfit.android.feature.feed.PostType
import com.lajesfit.android.feature.feed.ProfileSummary
import com.lajesfit.android.ui.theme.LajesFitTheme

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
                Text("Carregando perfil...")
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
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    ProfileHeaderCard(
                        profile = uiState.profile,
                        counts = uiState.counts,
                        isMe = uiState.isMe,
                        onOpenSettings = onOpenSettings,
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                    )
                }

                uiState.errorMessage?.let { message ->
                    item {
                        Card(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                            Text(message, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(14.dp))
                        }
                    }
                }

                item {
                    Text(
                        text = "Publicacoes",
                        style = MaterialTheme.typography.titleLarge,
                        modifier = Modifier.padding(horizontal = 16.dp),
                    )
                }

                when {
                    !uiState.canViewPosts -> {
                        item {
                            PrivateProfileCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp))
                        }
                    }
                    uiState.posts.isEmpty() -> {
                        item {
                            Card(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
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
                            HorizontalDivider()
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileHeaderCard(
    profile: UserProfile,
    counts: ProfileCounts,
    isMe: Boolean,
    onOpenSettings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                ProfileAvatar(profile.avatarUrl, profile.displayName, modifier = Modifier.size(72.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(profile.displayName, style = MaterialTheme.typography.headlineSmall)
                    Text(
                        text = "@${profile.username}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (isMe) {
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Filled.Settings, contentDescription = "Configuracoes")
                    }
                }
            }

            if (!profile.bio.isNullOrBlank()) {
                Text(profile.bio)
            }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                ProfileStat("Posts", counts.posts)
                ProfileStat("Treinos", counts.workouts)
                ProfileStat("Seguidores", counts.followers)
                ProfileStat("Seguindo", counts.following)
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
            modifier = modifier.clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                fallbackName.take(1).uppercase(),
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        }
    }
}

@Composable
private fun ProfileStat(label: String, value: Int) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value.toString(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun PrivateProfileCard(modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(Icons.Filled.Lock, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
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
            onLike = {},
            onDeletePost = {},
            onOpenComments = {},
            onOpenProfile = {},
        )
    }
}
