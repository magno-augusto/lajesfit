package com.lajesfit.android.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
    val isLoading: Boolean = true,
    val isSavingProfile: Boolean = false,
    val isUploadingAvatar: Boolean = false,
    val isSavingPrivacy: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
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
                _uiState.update {
                    it.copy(
                        settings = settings,
                        displayName = settings.displayName,
                        bio = settings.bio.orEmpty(),
                        avatarUrl = settings.avatarUrl,
                        isPrivate = settings.isPrivate,
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

    fun showError(message: String) {
        _uiState.update { it.copy(errorMessage = message, successMessage = null) }
    }
}
