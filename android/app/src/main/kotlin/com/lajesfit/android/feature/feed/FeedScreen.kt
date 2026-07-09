package com.lajesfit.android.feature.feed

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil3.compose.AsyncImage
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
            ) {
                CircularProgressIndicator(modifier = Modifier.padding(bottom = 8.dp))
                Text("Carregando feed...")
            }
        }
        uiState.posts.isEmpty() -> {
            Column(
                modifier = modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.Center,
            ) {
                Text("Nenhum post publicado ainda", style = MaterialTheme.typography.bodyLarge)
                if (uiState.errorMessage != null) {
                    Text(uiState.errorMessage, color = MaterialTheme.colorScheme.error)
                }
            }
        }
        else -> {
            LazyColumn(modifier = modifier.fillMaxSize()) {
                items(uiState.posts, key = { it.id }) { post ->
                    PostCard(
                        post = post,
                        canDelete = currentUserId == post.userId,
                        onLike = { onLike(post) },
                        onDelete = { onRequestDelete(post) },
                        onOpenComments = { onOpenComments(post.id) },
                        onOpenProfile = { onOpenProfile(post.profile.username) },
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    )
                    HorizontalDivider()
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
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
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
                    )
                    Text(
                        text = "@${post.profile.username} · ${timeAgo(post.createdAt)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                when (post.type) {
                    PostType.WORKOUT -> PostTypeBadge("Treino")
                    PostType.DIET -> PostTypeBadge("Dieta")
                    PostType.GENERAL -> {}
                }
                if (canDelete && onDelete != null) {
                    IconButton(onClick = { onDelete() }) {
                        Icon(Icons.Filled.Delete, contentDescription = "Apagar post")
                    }
                }
            }

            if (post.content.isNotBlank()) {
                Text(text = post.content, modifier = Modifier.padding(top = 8.dp))
            }

            PostMedia(post.mediaUrl)

            post.workout?.let { workout -> WorkoutStats(workout) }

            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = if (onLike != null) Modifier.clickable { onLike() } else Modifier,
                ) {
                    Icon(
                        imageVector = if (post.likedByMe) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                        contentDescription = "Curtir",
                        tint = if (post.likedByMe) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                    )
                    Text(text = post.likesCount.toString(), modifier = Modifier.padding(start = 4.dp))
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = if (onOpenComments != null) {
                        Modifier.clickable { onOpenComments() }
                    } else {
                        Modifier
                    },
                ) {
                    Icon(Icons.Filled.ChatBubbleOutline, contentDescription = "Comentarios")
                    Text(text = post.commentsCount.toString(), modifier = Modifier.padding(start = 4.dp))
                }
            }
        }
    }
}

@Composable
private fun PostTypeBadge(label: String) {
    Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.secondaryContainer) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
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
            modifier = Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Text(text = fallbackName.take(1).uppercase(), textAlign = TextAlign.Center)
        }
    }
}

private val VIDEO_EXTENSION_REGEX = Regex("\\.(mp4|webm|mov)($|\\?)", RegexOption.IGNORE_CASE)

@Composable
private fun PostMedia(mediaUrl: String?) {
    if (mediaUrl == null) return
    val isVideo = VIDEO_EXTENSION_REGEX.containsMatchIn(mediaUrl) || mediaUrl.contains("video", ignoreCase = true)
    if (isVideo) {
        Card(modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
            Text(
                text = "Video - abra pelo navegador pra assistir por enquanto",
                modifier = Modifier.padding(16.dp),
            )
        }
    } else {
        AsyncImage(
            model = mediaUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        )
    }
}

@Composable
private fun WorkoutStats(workout: WorkoutSummary) {
    Card(modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(text = workout.title ?: workout.activityType ?: "Treino", style = MaterialTheme.typography.titleSmall)
            val parts = buildList {
                workout.distanceMeters?.let { add("${"%.1f".format(it / 1000)} km") }
                workout.durationSeconds?.let { add("${it / 60} min") }
                workout.calories?.let { add("$it kcal") }
            }
            if (parts.isNotEmpty()) {
                Text(text = parts.joinToString(" · "), style = MaterialTheme.typography.bodySmall)
            }
        }
    }
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
                        workoutId = null,
                        profile = ProfileSummary("u1", "atleta_lajes", "Atleta Lajes", null),
                        workout = null,
                        likesCount = 3,
                        commentsCount = 1,
                        likedByMe = false,
                        type = PostType.GENERAL,
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
