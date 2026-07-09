package com.lajesfit.android.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileChromeUiState(
    val profile: ProfileChromeSummary? = null,
    val isLoading: Boolean = true,
)

@HiltViewModel
class ProfileChromeViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileChromeUiState())
    val uiState: StateFlow<ProfileChromeUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val profile = runCatching { profileRepository.currentProfileSummary() }.getOrNull()
            _uiState.update { it.copy(profile = profile, isLoading = false) }
        }
    }
}
