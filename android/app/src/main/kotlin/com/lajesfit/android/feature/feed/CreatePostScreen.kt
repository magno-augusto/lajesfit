package com.lajesfit.android.feature.feed

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
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

data class CreatePostUiState(
    val content: String = "",
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
)

/**
 * Espelha CreatePostDialog.tsx - so' texto nesta fase (upload de imagem/video fica de fora, ver
 * android/specs/M3-feed.md "Fora do escopo").
 */
@HiltViewModel
class CreatePostViewModel @Inject constructor(
    private val feedRepository: FeedRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CreatePostUiState())
    val uiState: StateFlow<CreatePostUiState> = _uiState.asStateFlow()

    fun onContentChange(value: String) {
        _uiState.update { it.copy(content = value, errorMessage = null) }
    }

    fun submit(onDone: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, errorMessage = null) }
            try {
                feedRepository.createPost(_uiState.value.content)
                onDone()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSaving = false, errorMessage = e.message ?: "Nao foi possivel publicar")
                }
            }
        }
    }
}

@Composable
fun CreatePostScreen(
    onDone: () -> Unit,
    viewModel: CreatePostViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    CreatePostScreenContent(
        uiState = uiState,
        onContentChange = viewModel::onContentChange,
        onSubmit = { viewModel.submit(onDone) },
        onCancel = onDone,
    )
}

@Composable
private fun CreatePostScreenContent(
    uiState: CreatePostUiState,
    onContentChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(text = "Novo post", style = MaterialTheme.typography.headlineMedium)

        OutlinedTextField(
            value = uiState.content,
            onValueChange = onContentChange,
            label = { Text("O que voce quer compartilhar?") },
            modifier = Modifier.fillMaxWidth().height(160.dp),
        )

        if (uiState.errorMessage != null) {
            Text(text = uiState.errorMessage, color = MaterialTheme.colorScheme.error)
        }

        Button(onClick = onSubmit, enabled = !uiState.isSaving, modifier = Modifier.fillMaxWidth()) {
            if (uiState.isSaving) {
                CircularProgressIndicator(modifier = Modifier.padding(end = 8.dp), strokeWidth = 2.dp)
            }
            Text("Publicar")
        }
        TextButton(onClick = onCancel, modifier = Modifier.fillMaxWidth()) {
            Text("Cancelar")
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun CreatePostScreenPreview() {
    LajesFitTheme {
        CreatePostScreenContent(
            uiState = CreatePostUiState(content = "Treino de hoje foi puxado!"),
            onContentChange = {},
            onSubmit = {},
            onCancel = {},
        )
    }
}
