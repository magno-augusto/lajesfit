package com.lajesfit.android.feature.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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

data class ForgotPasswordUiState(
    val username: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val emailSent: Boolean = false,
)

@HiltViewModel
class ForgotPasswordViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ForgotPasswordUiState())
    val uiState: StateFlow<ForgotPasswordUiState> = _uiState.asStateFlow()

    fun onUsernameChange(value: String) {
        _uiState.update { it.copy(username = value, errorMessage = null) }
    }

    fun requestReset() {
        val username = _uiState.value.username
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                authRepository.requestPasswordReset(username)
                _uiState.update { it.copy(isLoading = false, emailSent = true) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Nao foi possivel enviar o e-mail")
                }
            }
        }
    }
}

/** Espelha requestPasswordReset (auth.ts:88-106): pede username, nao e-mail. */
@Composable
fun ForgotPasswordScreen(
    onNavigateToLogin: () -> Unit,
    viewModel: ForgotPasswordViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    ForgotPasswordScreenContent(
        uiState = uiState,
        onUsernameChange = viewModel::onUsernameChange,
        onSubmit = viewModel::requestReset,
        onNavigateToLogin = onNavigateToLogin,
    )
}

@Composable
private fun ForgotPasswordScreenContent(
    uiState: ForgotPasswordUiState,
    onUsernameChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onNavigateToLogin: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text(text = "Esqueci minha senha", style = MaterialTheme.typography.headlineMedium)

        if (uiState.emailSent) {
            Text(
                text = "Enviamos um link de recuperacao para o e-mail cadastrado nessa conta.",
                modifier = Modifier.padding(top = 16.dp),
            )
        } else {
            Text(
                text = "Informe seu usuario para receber um link de recuperacao por e-mail.",
                modifier = Modifier.padding(top = 8.dp),
            )
            OutlinedTextField(
                value = uiState.username,
                onValueChange = onUsernameChange,
                label = { Text("Usuario") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            )

            if (uiState.errorMessage != null) {
                Text(
                    text = uiState.errorMessage,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            Button(
                onClick = onSubmit,
                enabled = !uiState.isLoading,
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp).padding(end = 8.dp), strokeWidth = 2.dp)
                }
                Text("Enviar link de recuperacao")
            }
        }

        TextButton(onClick = onNavigateToLogin, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
            Text("Voltar para o login")
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ForgotPasswordScreenPreview() {
    LajesFitTheme {
        ForgotPasswordScreenContent(
            uiState = ForgotPasswordUiState(username = "atleta_lajes"),
            onUsernameChange = {},
            onSubmit = {},
            onNavigateToLogin = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ForgotPasswordScreenSentPreview() {
    LajesFitTheme {
        ForgotPasswordScreenContent(
            uiState = ForgotPasswordUiState(username = "atleta_lajes", emailSent = true),
            onUsernameChange = {},
            onSubmit = {},
            onNavigateToLogin = {},
        )
    }
}
