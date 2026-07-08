package com.lajesfit.android.feature.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
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

data class RequireEmailUiState(
    val email: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val sentTo: String? = null,
)

@HiltViewModel
class RequireEmailViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RequireEmailUiState())
    val uiState: StateFlow<RequireEmailUiState> = _uiState.asStateFlow()

    fun onEmailChange(value: String) {
        _uiState.update { it.copy(email = value, errorMessage = null) }
    }

    fun submit() {
        val cleanEmail = _uiState.value.email.trim().lowercase()
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                authRepository.setRealEmail(cleanEmail)
                _uiState.update { it.copy(isLoading = false, sentTo = cleanEmail) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Nao foi possivel salvar o e-mail")
                }
            }
        }
    }

    fun logout(onLoggedOut: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            onLoggedOut()
        }
    }
}

/**
 * Espelha RequireEmail.tsx: conta legada (e-mail @lajesfit.local) sem troca pendente. Nao e' um
 * gate destrutivo - "Continuar por agora" libera a navegacao mesmo sem completar (ver
 * android/specs/M1-supabase-auth.md).
 */
@Composable
fun RequireEmailScreen(
    onSkip: () -> Unit,
    onLoggedOut: () -> Unit,
    viewModel: RequireEmailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    RequireEmailScreenContent(
        uiState = uiState,
        onEmailChange = viewModel::onEmailChange,
        onSubmit = viewModel::submit,
        onSkip = onSkip,
        onLogout = { viewModel.logout(onLoggedOut) },
    )
}

@Composable
private fun RequireEmailScreenContent(
    uiState: RequireEmailUiState,
    onEmailChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onSkip: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text(text = "Cadastre seu e-mail", style = MaterialTheme.typography.headlineMedium)
        Text(
            text = "Sua conta ainda nao tem um e-mail real. Cadastre um para conseguir recuperar " +
                "sua senha caso a esqueca.",
            modifier = Modifier.padding(top = 8.dp),
        )

        if (uiState.sentTo != null) {
            Text(
                text = "Enviamos um link de confirmacao para ${uiState.sentTo}. Clique no link para concluir.",
                modifier = Modifier.padding(top = 16.dp),
            )
            OutlinedButton(onClick = onSkip, modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) {
                Text("Continuar por agora")
            }
        } else {
            OutlinedTextField(
                value = uiState.email,
                onValueChange = onEmailChange,
                label = { Text("E-mail") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
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
                Text("Salvar e-mail")
            }
        }

        TextButton(onClick = onLogout, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
            Text("Sair da conta")
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun RequireEmailScreenPreview() {
    LajesFitTheme {
        RequireEmailScreenContent(
            uiState = RequireEmailUiState(),
            onEmailChange = {},
            onSubmit = {},
            onSkip = {},
            onLogout = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun RequireEmailScreenSentPreview() {
    LajesFitTheme {
        RequireEmailScreenContent(
            uiState = RequireEmailUiState(sentTo = "atleta@email.com"),
            onEmailChange = {},
            onSubmit = {},
            onSkip = {},
            onLogout = {},
        )
    }
}
