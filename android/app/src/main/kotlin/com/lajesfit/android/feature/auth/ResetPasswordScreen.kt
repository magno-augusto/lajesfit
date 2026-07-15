package com.lajesfit.android.feature.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.text.KeyboardOptions
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lajesfit.android.ui.theme.BebasNeue
import com.lajesfit.android.ui.theme.LajesFitTheme
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ResetPasswordUiState(
    val newPassword: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val done: Boolean = false,
)

@HiltViewModel
class ResetPasswordViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ResetPasswordUiState())
    val uiState: StateFlow<ResetPasswordUiState> = _uiState.asStateFlow()

    fun onPasswordChange(value: String) {
        _uiState.update { it.copy(newPassword = value, errorMessage = null) }
    }

    fun confirm() {
        val password = _uiState.value.newPassword
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                authRepository.confirmNewPassword(password)
                _uiState.update { it.copy(isLoading = false, done = true) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Nao foi possivel definir a nova senha")
                }
            }
        }
    }
}

/**
 * Destino do deep link de recovery (supabaseClient.handleDeeplinks em MainActivity). A sessao de
 * recovery ja esta ativa quando esta tela abre; confirmNewPassword so atualiza a senha
 * (auth.ts:110-116) - ver android/specs/M1-supabase-auth.md.
 * Visual: mesmo card branco com borda+sombra leve e titulo Bebas maiusculo das
 * demais telas de auth.
 */
@Composable
fun ResetPasswordScreen(
    onDone: () -> Unit,
    viewModel: ResetPasswordViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.done) {
        if (uiState.done) onDone()
    }

    ResetPasswordScreenContent(
        uiState = uiState,
        onPasswordChange = viewModel::onPasswordChange,
        onConfirm = viewModel::confirm,
    )
}

@Composable
private fun ResetPasswordScreenContent(
    uiState: ResetPasswordUiState,
    onPasswordChange: (String) -> Unit,
    onConfirm: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(text = "LAJES FIT", style = MaterialTheme.typography.displayMedium)

        Card(
            modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = "DEFINA SUA NOVA SENHA", fontFamily = BebasNeue, fontSize = 22.sp)

                OutlinedTextField(
                    value = uiState.newPassword,
                    onValueChange = onPasswordChange,
                    label = { Text("Nova senha (minimo 6 caracteres)") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
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
                    onClick = onConfirm,
                    enabled = !uiState.isLoading,
                    modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp).padding(end = 8.dp), strokeWidth = 2.dp)
                    }
                    Text("Salvar nova senha")
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ResetPasswordScreenPreview() {
    LajesFitTheme {
        ResetPasswordScreenContent(
            uiState = ResetPasswordUiState(),
            onPasswordChange = {},
            onConfirm = {},
        )
    }
}
