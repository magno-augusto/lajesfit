package com.lajesfit.android.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lajesfit.android.feature.auth.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val settings: ProfileSettings? = null,
    val displayName: String = "",
    val bio: String = "",
    val avatarUrl: String? = null,
    val isPrivate: Boolean = false,
    val notificationsEnabled: Boolean = true,
    val notifyLikes: Boolean = true,
    val notifyComments: Boolean = true,
    val notifyFollows: Boolean = true,
    val notifyChallenges: Boolean = true,
    val hasPasswordLogin: Boolean = false,
    val currentEmail: String? = null,
    val pendingEmail: String? = null,
    val recoveryEmail: String = "",
    val currentPassword: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val isLoading: Boolean = true,
    val isSavingProfile: Boolean = false,
    val isUploadingAvatar: Boolean = false,
    val isSavingPrivacy: Boolean = false,
    val isSavingNotificationsEnabled: Boolean = false,
    val savingNotificationPreference: NotificationPreference? = null,
    val isSavingPassword: Boolean = false,
    val isSavingEmail: Boolean = false,
    val isLoggingOut: Boolean = false,
    val loggedOut: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val settings = settingsRepository.getProfileSettings()
                if (settings == null) {
                    _uiState.update {
                        SettingsUiState(isLoading = false, errorMessage = "Nao foi possivel carregar seu perfil")
                    }
                    return@launch
                }

                val user = authRepository.currentUser()
                val currentEmail = user?.email?.takeUnless { it.endsWith(AuthRepository.LEGACY_EMAIL_DOMAIN) }
                _uiState.update {
                    it.copy(
                        settings = settings,
                        displayName = settings.displayName,
                        bio = settings.bio.orEmpty(),
                        avatarUrl = settings.avatarUrl,
                        isPrivate = settings.isPrivate,
                        notificationsEnabled = settings.notificationsEnabled,
                        notifyLikes = settings.notifyLikes,
                        notifyComments = settings.notifyComments,
                        notifyFollows = settings.notifyFollows,
                        notifyChallenges = settings.notifyChallenges,
                        hasPasswordLogin = authRepository.hasPasswordLogin(user),
                        currentEmail = currentEmail,
                        pendingEmail = user?.newEmail,
                        recoveryEmail = currentEmail.orEmpty(),
                        isLoading = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Nao foi possivel carregar configuracoes")
                }
            }
        }
    }

    fun onDisplayNameChange(value: String) {
        _uiState.update { it.copy(displayName = value, successMessage = null, errorMessage = null) }
    }

    fun onBioChange(value: String) {
        _uiState.update { it.copy(bio = value, successMessage = null, errorMessage = null) }
    }

    fun onRecoveryEmailChange(value: String) {
        _uiState.update { it.copy(recoveryEmail = value, successMessage = null, errorMessage = null) }
    }

    fun onCurrentPasswordChange(value: String) {
        _uiState.update { it.copy(currentPassword = value, successMessage = null, errorMessage = null) }
    }

    fun onNewPasswordChange(value: String) {
        _uiState.update { it.copy(newPassword = value, successMessage = null, errorMessage = null) }
    }

    fun onConfirmPasswordChange(value: String) {
        _uiState.update { it.copy(confirmPassword = value, successMessage = null, errorMessage = null) }
    }

    fun saveProfile() {
        val state = _uiState.value
        val displayName = state.displayName.trim()
        if (displayName.isEmpty()) {
            _uiState.update { it.copy(errorMessage = "Informe seu nome") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSavingProfile = true, errorMessage = null, successMessage = null) }
            try {
                val bio = state.bio.trim().ifBlank { null }
                settingsRepository.updateProfileSettings(displayName, bio, state.avatarUrl)
                _uiState.update {
                    it.copy(
                        settings = it.settings?.copy(displayName = displayName, bio = bio, avatarUrl = state.avatarUrl),
                        isSavingProfile = false,
                        successMessage = "Perfil atualizado",
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSavingProfile = false, errorMessage = e.message ?: "Nao foi possivel salvar o perfil")
                }
            }
        }
    }

    fun uploadAvatar(photoBytes: ByteArray) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUploadingAvatar = true, errorMessage = null, successMessage = null) }
            try {
                val url = settingsRepository.uploadAvatar(photoBytes)
                _uiState.update {
                    it.copy(
                        avatarUrl = url,
                        settings = it.settings?.copy(avatarUrl = url),
                        isUploadingAvatar = false,
                        successMessage = "Foto atualizada",
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isUploadingAvatar = false, errorMessage = e.message ?: "Nao foi possivel enviar a foto")
                }
            }
        }
    }

    fun updatePrivacy(isPrivate: Boolean) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSavingPrivacy = true, errorMessage = null, successMessage = null) }
            try {
                settingsRepository.updateProfilePrivacy(isPrivate)
                _uiState.update {
                    it.copy(
                        isPrivate = isPrivate,
                        settings = it.settings?.copy(isPrivate = isPrivate),
                        isSavingPrivacy = false,
                        successMessage = if (isPrivate) "Perfil privado ativado" else "Perfil publico ativado",
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSavingPrivacy = false, errorMessage = e.message ?: "Nao foi possivel alterar privacidade")
                }
            }
        }
    }

    fun updateNotificationsEnabled(enabled: Boolean) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(isSavingNotificationsEnabled = true, errorMessage = null, successMessage = null)
            }
            try {
                settingsRepository.updateNotificationsEnabled(enabled)
                _uiState.update {
                    it.copy(
                        notificationsEnabled = enabled,
                        settings = it.settings?.copy(notificationsEnabled = enabled),
                        isSavingNotificationsEnabled = false,
                        successMessage = if (enabled) "Notificacoes ativadas" else "Notificacoes silenciadas",
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSavingNotificationsEnabled = false,
                        errorMessage = e.message ?: "Nao foi possivel alterar notificacoes",
                    )
                }
            }
        }
    }

    fun updateNotificationPreference(preference: NotificationPreference, enabled: Boolean) {
        val previous = preferenceValue(_uiState.value, preference)
        _uiState.update {
            setPreferenceValue(
                state = it.copy(
                    savingNotificationPreference = preference,
                    errorMessage = null,
                    successMessage = null,
                ),
                preference = preference,
                enabled = enabled,
            )
        }

        viewModelScope.launch {
            try {
                settingsRepository.updateNotificationPreference(preference, enabled)
                _uiState.update {
                    setPreferenceValue(
                        state = it.copy(
                            settings = it.settings?.withPreference(preference, enabled),
                            savingNotificationPreference = null,
                            successMessage = "Preferencia salva",
                        ),
                        preference = preference,
                        enabled = enabled,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    setPreferenceValue(
                        state = it.copy(
                            savingNotificationPreference = null,
                            errorMessage = e.message ?: "Nao foi possivel salvar a preferencia",
                        ),
                        preference = preference,
                        enabled = previous,
                    )
                }
            }
        }
    }

    fun savePassword() {
        val state = _uiState.value
        val newPassword = state.newPassword.trim()
        val confirmPassword = state.confirmPassword.trim()
        if (newPassword.length < 6) {
            _uiState.update { it.copy(errorMessage = "A senha precisa ter pelo menos 6 caracteres") }
            return
        }
        if (newPassword != confirmPassword) {
            _uiState.update { it.copy(errorMessage = "As senhas nao conferem") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSavingPassword = true, errorMessage = null, successMessage = null) }
            try {
                if (state.hasPasswordLogin) {
                    authRepository.changePassword(state.currentPassword, newPassword)
                } else {
                    authRepository.setPassword(newPassword)
                }
                _uiState.update {
                    it.copy(
                        currentPassword = "",
                        newPassword = "",
                        confirmPassword = "",
                        hasPasswordLogin = true,
                        isSavingPassword = false,
                        successMessage = if (state.hasPasswordLogin) {
                            "Senha alterada com sucesso"
                        } else {
                            "Senha definida com sucesso"
                        },
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSavingPassword = false, errorMessage = e.message ?: "Nao foi possivel salvar a senha")
                }
            }
        }
    }

    fun saveRecoveryEmail() {
        val email = _uiState.value.recoveryEmail.trim().lowercase()
        viewModelScope.launch {
            _uiState.update { it.copy(isSavingEmail = true, errorMessage = null, successMessage = null) }
            try {
                val user = authRepository.setRealEmail(email)
                _uiState.update {
                    it.copy(
                        pendingEmail = user.newEmail ?: email,
                        isSavingEmail = false,
                        successMessage = "Enviamos um link de confirmacao para o novo e-mail",
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSavingEmail = false, errorMessage = e.message ?: "Nao foi possivel salvar o e-mail")
                }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoggingOut = true, errorMessage = null, successMessage = null) }
            try {
                authRepository.logout()
                _uiState.update { it.copy(isLoggingOut = false, loggedOut = true) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoggingOut = false, errorMessage = e.message ?: "Nao foi possivel sair da conta")
                }
            }
        }
    }

    fun showError(message: String) {
        _uiState.update { it.copy(errorMessage = message, successMessage = null) }
    }
}

private fun preferenceValue(state: SettingsUiState, preference: NotificationPreference): Boolean = when (preference) {
    NotificationPreference.Likes -> state.notifyLikes
    NotificationPreference.Comments -> state.notifyComments
    NotificationPreference.Follows -> state.notifyFollows
    NotificationPreference.Challenges -> state.notifyChallenges
}

private fun setPreferenceValue(
    state: SettingsUiState,
    preference: NotificationPreference,
    enabled: Boolean,
): SettingsUiState = when (preference) {
    NotificationPreference.Likes -> state.copy(notifyLikes = enabled)
    NotificationPreference.Comments -> state.copy(notifyComments = enabled)
    NotificationPreference.Follows -> state.copy(notifyFollows = enabled)
    NotificationPreference.Challenges -> state.copy(notifyChallenges = enabled)
}

private fun ProfileSettings.withPreference(
    preference: NotificationPreference,
    enabled: Boolean,
): ProfileSettings = when (preference) {
    NotificationPreference.Likes -> copy(notifyLikes = enabled)
    NotificationPreference.Comments -> copy(notifyComments = enabled)
    NotificationPreference.Follows -> copy(notifyFollows = enabled)
    NotificationPreference.Challenges -> copy(notifyChallenges = enabled)
}
