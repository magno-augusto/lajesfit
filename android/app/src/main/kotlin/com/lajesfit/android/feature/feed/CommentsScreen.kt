package com.lajesfit.android.feature.feed

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lajesfit.android.ui.theme.LajesFitTheme
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CommentsUiState(
    val comments: List<PostComment> = emptyList(),
    val input: String = "",
    val isLoading: Boolean = true,
    val isSending: Boolean = false,
    val errorMessage: String? = null,
)

/**
 * Espelha CommentsDialog.tsx, mas como tela separada (post/{postId}/comments), nao modal - decisao
 * ja registrada em android/specs/PLANO.md e retomada em android/specs/M3-feed.md.
 */
@HiltViewModel
class CommentsViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val commentsRepository: CommentsRepository,
    private val feedRepository: FeedRepository,
) : ViewModel() {

    private val postId: String = checkNotNull(savedStateHandle["postId"])

    private val _uiState = MutableStateFlow(CommentsUiState())
    val uiState: StateFlow<CommentsUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun currentUserId(): String? = feedRepository.currentUserId()

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val comments = commentsRepository.fetchComments(postId)
                _uiState.update { it.copy(comments = comments, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Nao foi possivel carregar os comentarios")
                }
            }
        }
    }

    fun onInputChange(value: String) {
        _uiState.update { it.copy(input = value, errorMessage = null) }
    }

    fun submit() {
        val text = _uiState.value.input
        viewModelScope.launch {
            _uiState.update { it.copy(isSending = true) }
            try {
                commentsRepository.addComment(postId, text)
                _uiState.update { it.copy(input = "", isSending = false) }
                load()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSending = false, errorMessage = e.message ?: "Nao foi possivel comentar")
                }
            }
        }
    }

    fun delete(commentId: String) {
        viewModelScope.launch {
            try {
                commentsRepository.deleteComment(commentId)
                _uiState.update { state -> state.copy(comments = state.comments.filterNot { it.id == commentId }) }
            } catch (e: Exception) {
                _uiState.update { it.copy(errorMessage = e.message ?: "Nao foi possivel apagar o comentario") }
            }
        }
    }
}

@Composable
fun CommentsScreen(
    onDone: () -> Unit,
    viewModel: CommentsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val currentUserId = viewModel.currentUserId()
    CommentsScreenContent(
        uiState = uiState,
        currentUserId = currentUserId,
        onInputChange = viewModel::onInputChange,
        onSubmit = viewModel::submit,
        onDeleteComment = viewModel::delete,
        onBack = onDone,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CommentsScreenContent(
    uiState: CommentsUiState,
    currentUserId: String?,
    onInputChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onDeleteComment: (String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(title = { Text("Comentarios") })
        },
        bottomBar = {
            Row(
                modifier = Modifier.fillMaxWidth().padding(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedTextField(
                    value = uiState.input,
                    onValueChange = onInputChange,
                    label = { Text("Escreva um comentario") },
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onSubmit, enabled = !uiState.isSending) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Enviar comentario")
                }
            }
        },
    ) { contentPadding ->
        Column(modifier = Modifier.padding(contentPadding).fillMaxSize()) {
            if (uiState.errorMessage != null) {
                Text(
                    text = uiState.errorMessage,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(8.dp),
                )
            }
            when {
                uiState.isLoading -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }
                uiState.comments.isEmpty() -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Text("Nenhum comentario ainda")
                    }
                }
                else -> {
                    LazyColumn(modifier = Modifier.fillMaxSize()) {
                        items(uiState.comments, key = { it.id }) { comment ->
                            CommentRow(
                                comment = comment,
                                canDelete = currentUserId != null && comment.profile.id == currentUserId,
                                onDelete = { onDeleteComment(comment.id) },
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
private fun CommentRow(comment: PostComment, canDelete: Boolean, onDelete: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = comment.profile.displayName ?: comment.profile.username,
                style = MaterialTheme.typography.titleSmall,
            )
            Text(
                text = "@${comment.profile.username} · ${timeAgo(comment.createdAt)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(text = comment.content, modifier = Modifier.padding(top = 4.dp))
        }
        if (canDelete) {
            IconButton(onClick = onDelete) {
                Icon(Icons.Filled.Delete, contentDescription = "Apagar comentario")
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun CommentsScreenPreview() {
    LajesFitTheme {
        CommentsScreenContent(
            uiState = CommentsUiState(
                comments = listOf(
                    PostComment(
                        id = "1",
                        postId = "p1",
                        content = "Mandou bem!",
                        createdAt = "2026-07-08T12:00:00Z",
                        profile = ProfileSummary("u2", "outro_atleta", "Outro Atleta", null),
                    ),
                ),
                isLoading = false,
            ),
            currentUserId = "u1",
            onInputChange = {},
            onSubmit = {},
            onDeleteComment = {},
            onBack = {},
        )
    }
}
