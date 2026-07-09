package com.lajesfit.android.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchProfilesUiState(
    val query: String = "",
    val results: List<ProfileSearchResult> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
) {
    val cleanQuery: String = query.trim().replace(Regex("[,()%*]"), "")
    val shouldSearch: Boolean = cleanQuery.length >= 2
}

@OptIn(FlowPreview::class)
@HiltViewModel
class SearchProfilesViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
) : ViewModel() {

    private val queries = MutableStateFlow("")
    private val _uiState = MutableStateFlow(SearchProfilesUiState())
    val uiState: StateFlow<SearchProfilesUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            queries
                .debounce(300)
                .distinctUntilChanged()
                .collect { query -> search(query) }
        }
    }

    fun onQueryChange(query: String) {
        queries.value = query
        _uiState.update { it.copy(query = query, errorMessage = null) }
    }

    private suspend fun search(query: String) {
        val cleanQuery = query.trim().replace(Regex("[,()%*]"), "")
        if (cleanQuery.length < 2) {
            _uiState.update { it.copy(results = emptyList(), isLoading = false, errorMessage = null) }
            return
        }

        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        try {
            val results = profileRepository.searchProfiles(query)
            _uiState.update { it.copy(results = results, isLoading = false) }
        } catch (e: Exception) {
            _uiState.update {
                it.copy(isLoading = false, errorMessage = e.message ?: "Nao foi possivel buscar perfis")
            }
        }
    }
}
