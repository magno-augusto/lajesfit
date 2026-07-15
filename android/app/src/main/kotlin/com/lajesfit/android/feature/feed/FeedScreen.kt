package com.lajesfit.android.feature.feed

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.AlertDialog
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil3.compose.AsyncImage
import com.lajesfit.android.ui.theme.BebasNeue
import com.lajesfit.android.ui.theme.LajesFitSuccess
import com.lajesfit.android.ui.theme.LajesFitTheme
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FeedUiState(
    val posts: List<FeedPost> = emptyList(),
    val isLoading: Boolean = true,
    val isLoadingMore: Boolean = false,
    val hasMore: Boolean = true,
    val errorMessage: String? = null,
)

/** Espelha FeedPage.tsx - ver android/specs/M3-feed.md. */
@HiltViewModel
class FeedViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val feedRepository: FeedRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(FeedUiState())
    val uiState: StateFlow<FeedUiState> = _uiState.asStateFlow()

    init {
        loadFirstPage()
        // CreatePostScreen/CommentsScreen sinalizam aqui quando algo muda (post criado/apagado,
        // contagem de comentario) - o ViewModel do Feed continua vivo ao navegar pra essas telas e
        // voltar, entao precisa desse gatilho explicito pra recarregar (nao ha CHANGE_EVENT global
        // como no web, ver CLAUDE.md "O que NAO portar do web").
        viewModelScope.launch {
            savedStateHandle.getStateFlow(REFRESH_KEY, false).collect { shouldRefresh ->
                if (shouldRefresh) {
                    savedStateHandle[REFRESH_KEY] = false
                    loadFirstPage()
                }
            }
        }
    }

    fun currentUserId(): String? = feedRepository.currentUserId()

    fun loadFirstPage() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val page = feedRepository.fetchFeed(offset = 0)
                _uiState.update {
                    it.copy(posts = page, isLoading = false, hasMore = page.size == FeedRepository.FEED_PAGE_SIZE)
                }
                feedRepository.markPostsViewed(page.map { post -> post.id })
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Nao foi possivel carregar o feed")
                }
            }
        }
    }

    fun loadMore() {
        val state = _uiState.value
        if (state.isLoadingMore || !state.hasMore) return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingMore = true) }
            try {
                val page = feedRepository.fetchFeed(offset = state.posts.size)
                _uiState.update {
                    // marcar a pagina como vista muda a ordenacao da RPC pra proxima chamada
                    // (nao-visto-primeiro), entao o offset seguinte pode trazer um post repetido -
                    // filtra por id pra nao quebrar a key do LazyColumn.
                    val existingIds = it.posts.mapTo(mutableSetOf()) { existing -> existing.id }
                    val newPosts = page.filterNot { candidate -> candidate.id in existingIds }
                    it.copy(
                        posts = it.posts + newPosts,
                        isLoadingMore = false,
                        hasMore = page.size == FeedRepository.FEED_PAGE_SIZE,
                    )
                }
                feedRepository.markPostsViewed(page.map { post -> post.id })
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoadingMore = false, errorMessage = e.message ?: "Nao foi possivel carregar mais posts")
                }
            }
        }
    }

    fun toggleLike(post: FeedPost) {
        val optimistic = post.copy(
            likedByMe = !post.likedByMe,
            likesCount = post.likesCount + if (post.likedByMe) -1 else 1,
        )
        replacePost(optimistic)
        viewModelScope.launch {
            try {
                if (optimistic.likedByMe) feedRepository.likePost(post.id) else feedRepository.unlikePost(post.id)
            } catch (e: Exception) {
                replacePost(post)
            }
        }
    }

    fun deletePost(postId: String) {
        viewModelScope.launch {
            try {
                feedRepository.deletePost(postId)
                _uiState.update { state -> state.copy(posts = state.posts.filterNot { it.id == postId }) }
            } catch (e: Exception) {
                _uiState.update { it.copy(errorMessage = e.message ?: "Nao foi possivel apagar o post") }
            }
        }
    }

    private fun replacePost(post: FeedPost) {
        _uiState.update { state -> state.copy(posts = state.posts.map { if (it.id == post.id) post else it }) }
    }

    companion object {
        /** Chave do savedStateHandle da entrada do Feed no NavHost - CreatePostScreen seta isso
         * antes de voltar pra sinalizar que precisa recarregar (ver comentario no init acima). */
        const val REFRESH_KEY = "feed_refresh"
    }
}

// Espelha src/features/feed/FeedPage.tsx + PostCard.tsx: card branco por post
// com midia full-bleed, badge de tipo (Treino/Dieta) e bloco de stats de
// treino em fundo solido (web usa gradiente ember; aqui secondary solido, ver
// specs/M3-feed.md). Compartilhar post, upload de midia no CreatePostScreen e
// player de video inline ficam fora de escopo Android.

@Composable
fun FeedScreen(
    onOpenComments: (String) -> Unit,
    onOpenProfile: (String) -> Unit,
    viewModel: FeedViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val currentUserId = remember { viewModel.currentUserId() }
    var postPendingDelete by remember { mutableStateOf<FeedPost?>(null) }

    FeedScreenContent(
        uiState = uiState,
        currentUserId = currentUserId,
        onLike = viewModel::toggleLike,
        onRequestDelete = { post -> postPendingDelete = post },
        onLoadMore = viewModel::loadMore,
        onOpenComments = onOpenComments,
        onOpenProfile = onOpenProfile,
    )

    val pending = postPendingDelete
    if (pending != null) {
        AlertDialog(
            onDismissRequest = { postPendingDelete = null },
            title = { Text("Apagar post?") },
            text = { Text("Essa acao nao pode ser desfeita.") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deletePost(pending.id)
                    postPendingDelete = null
                }) { Text("Apagar") }
            },
            dismissButton = {
                TextButton(onClick = { postPendingDelete = null }) { Text("Cancelar") }
            },
        )
    }
}

@Composable
private fun FeedScreenContent(
    uiState: FeedUiState,
    currentUserId: String?,
    onLike: (FeedPost) -> Unit,
    onRequestDelete: (FeedPost) -> Unit,
    onLoadMore: () -> Unit,
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
                Text("Carregando feed...", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        uiState.posts.isEmpty() -> {
            Column(
                modifier = modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = "Nenhum post publicado ainda",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (uiState.errorMessage != null) {
                    Text(uiState.errorMessage, color = MaterialTheme.colorScheme.error)
                }
            }
        }
        else -> {
            LazyColumn(
                modifier = modifier.fillMaxSize(),
                contentPadding = PaddingValues(top = 12.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(uiState.posts, key = { it.id }) { post ->
                    PostCard(
                        post = post,
                        canDelete = currentUserId == post.userId,
                        onLike = { onLike(post) },
                        onDelete = { onRequestDelete(post) },
                        onOpenComments = { onOpenComments(post.id) },
                        onOpenProfile = { onOpenProfile(post.profile.username) },
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    )
                }
                if (uiState.hasMore) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            if (uiState.isLoadingMore) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp))
                            } else {
                                OutlinedButton(onClick = onLoadMore) { Text("Carregar mais") }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PostCard(
    post: FeedPost,
    canDelete: Boolean,
    onLike: (() -> Unit)?,
    onDelete: (() -> Unit)?,
    onOpenComments: (() -> Unit)?,
    onOpenProfile: (() -> Unit)?,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                PostAvatar(post.profile.avatarUrl, post.profile.displayName ?: post.profile.username)
                Column(
                    modifier = Modifier.weight(1f)
                        .then(
                            if (onOpenProfile != null) {
                                Modifier.clickable { onOpenProfile() }
                            } else {
                                Modifier
                            },
                        ),
                ) {
                    Text(
                        text = post.profile.displayName ?: post.profile.username,
                        style = MaterialTheme.typography.titleSmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = "@${post.profile.username} - ${timeAgo(post.createdAt)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                when (post.type) {
                    PostType.WORKOUT -> PostTypeBadge("Treino", MaterialTheme.colorScheme.primary)
                    PostType.DIET -> PostTypeBadge("Dieta", LajesFitSuccess)
                    PostType.GENERAL -> {}
                }
                if (canDelete && onDelete != null) {
                    IconButton(onClick = { onDelete() }) {
                        Icon(
                            Icons.Filled.Delete,
                            contentDescription = "Apagar post",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            PostMedia(post.mediaUrl)

            if (post.content.isNotBlank()) {
                Text(
                    text = post.content,
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                )
            }

            post.workout?.let { workout ->
                WorkoutStatsBlock(
                    workout = workout,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 12.dp),
                )
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outline, modifier = Modifier.padding(top = 8.dp))
            Row(
                modifier = Modifier.fillMaxWidth().padding(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .then(if (onLike != null) Modifier.clickable { onLike() } else Modifier)
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Icon(
                        imageVector = if (post.likedByMe) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                        contentDescription = "Curtir",
                        tint = if (post.likedByMe) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp),
                    )
                    Text(
                        text = post.likesCount.toString(),
                        style = MaterialTheme.typography.labelLarge,
                        color = if (post.likedByMe) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .then(if (onOpenComments != null) Modifier.clickable { onOpenComments() } else Modifier)
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Icon(
                        Icons.Filled.ChatBubbleOutline,
                        contentDescription = "Comentarios",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp),
                    )
                    Text(
                        text = post.commentsCount.toString(),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun PostTypeBadge(label: String, color: Color) {
    Surface(
        shape = RoundedCornerShape(50),
        color = color.copy(alpha = 0.1f),
        border = BorderStroke(1.dp, color.copy(alpha = 0.2f)),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = color,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}

@Composable
private fun PostAvatar(avatarUrl: String?, fallbackName: String) {
    if (avatarUrl != null) {
        AsyncImage(
            model = avatarUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(40.dp).clip(CircleShape),
        )
    } else {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = fallbackName.take(1).uppercase(),
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}

private val VIDEO_EXTENSION_REGEX = Regex("\\.(mp4|webm|mov)($|\\?)", RegexOption.IGNORE_CASE)

@Composable
private fun PostMedia(mediaUrl: String?) {
    if (mediaUrl == null) return
    val isVideo = VIDEO_EXTENSION_REGEX.containsMatchIn(mediaUrl) || mediaUrl.contains("video", ignoreCase = true)
    if (isVideo) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .background(MaterialTheme.colorScheme.surfaceContainerHigh),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "Video - abra pelo navegador pra assistir por enquanto",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(24.dp),
            )
        }
    } else {
        AsyncImage(
            model = mediaUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxWidth().aspectRatio(1f),
        )
    }
}

@Composable
private fun WorkoutStatsBlock(workout: WorkoutSummary, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.secondary)
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(
                Icons.AutoMirrored.Filled.DirectionsRun,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSecondary,
                modifier = Modifier.size(18.dp),
            )
            Text(
                text = workout.title?.takeIf { it.isNotBlank() } ?: workout.activityType ?: "Treino",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            WorkoutStatItem(
                label = "Distancia",
                value = formatWorkoutDistance(workout.distanceMeters),
                modifier = Modifier.weight(1f),
            )
            WorkoutStatItem(
                label = "Tempo",
                value = formatWorkoutDuration(workout.durationSeconds),
                modifier = Modifier.weight(1f),
            )
            WorkoutStatItem(
                label = "Calorias",
                value = workout.calories?.toString() ?: "-",
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun WorkoutStatItem(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = value, fontFamily = BebasNeue, fontSize = 22.sp, color = MaterialTheme.colorScheme.onSecondary)
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSecondary.copy(alpha = 0.8f),
        )
    }
}

private fun formatWorkoutDistance(distanceMeters: Double?): String {
    val meters = distanceMeters ?: return "-"
    return "%.2f km".format(meters / 1000.0)
}

private fun formatWorkoutDuration(seconds: Int?): String {
    val total = seconds ?: return "-"
    if (total <= 0) return "-"
    val hours = total / 3600
    val minutes = (total % 3600) / 60
    val secs = total % 60
    return if (hours > 0) "%dh%02d".format(hours, minutes) else "%d:%02d".format(minutes, secs)
}

@Preview(showBackground = true)
@Composable
private fun FeedScreenPreview() {
    LajesFitTheme {
        FeedScreenContent(
            uiState = FeedUiState(
                posts = listOf(
                    FeedPost(
                        id = "1",
                        content = "Treino de hoje foi puxado!",
                        mediaUrl = null,
                        createdAt = "2026-07-08T12:00:00Z",
                        userId = "u1",
                        workoutId = "w1",
                        profile = ProfileSummary("u1", "atleta_lajes", "Atleta Lajes", null),
                        workout = WorkoutSummary(
                            id = "w1",
                            activityType = "Corrida",
                            distanceMeters = 5200.0,
                            durationSeconds = 1860,
                            calories = 410,
                            title = "Corrida no fim da tarde",
                            stravaActivityId = null,
                        ),
                        likesCount = 3,
                        commentsCount = 1,
                        likedByMe = true,
                        type = PostType.WORKOUT,
                    ),
                ),
                isLoading = false,
            ),
            currentUserId = "u1",
            onLike = {},
            onRequestDelete = {},
            onLoadMore = {},
            onOpenComments = {},
            onOpenProfile = {},
        )
    }
}
