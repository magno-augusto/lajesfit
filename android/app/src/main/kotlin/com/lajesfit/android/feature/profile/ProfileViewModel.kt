package com.lajesfit.android.feature.profile

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lajesfit.android.feature.feed.FeedPost
import com.lajesfit.android.feature.feed.FeedRepository
import com.lajesfit.android.navigation.ProfileRoutes
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val currentUserId: String? = null,
    val profile: UserProfile? = null,
    val counts: ProfileCounts = ProfileCounts(),
    val followStatus: FollowStatus = FollowStatus.NONE,
    val incomingRequests: List<IncomingFollowRequest> = emptyList(),
    val posts: List<FeedPost> = emptyList(),
    val isLoading: Boolean = true,
    val isBusy: Boolean = false,
    val errorMessage: String? = null,
) {
    val isMe: Boolean = currentUserId != null && profile?.id == currentUserId
    val canViewPosts: Boolean = isMe || followStatus == FollowStatus.FOLLOWING || profile?.isPrivate == false
}

@HiltViewModel
class ProfileViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val profileRepository: ProfileRepository,
    private val feedRepository: FeedRepository,
) : ViewModel() {

    private val username: String = savedStateHandle[ProfileRoutes.UsernameArg] ?: ""

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val currentUserId = profileRepository.currentUserId()
                if (currentUserId == null) {
                    _uiState.update {
                        ProfileUiState(isLoading = false, errorMessage = "Sessao expirada. Entre novamente.")
                    }
                    return@launch
                }

                val profile = profileRepository.getProfileByUsername(username)
                if (profile == null) {
                    _uiState.update {
                        ProfileUiState(currentUserId = currentUserId, isLoading = false, errorMessage = "Perfil nao encontrado")
                    }
                    return@launch
                }

                val counts = profileRepository.getProfileCounts(profile.id)
                val isMe = profile.id == currentUserId
                val followStatus = if (isMe) {
                    FollowStatus.NONE
                } else {
                    profileRepository.getFollowStatus(profile.id, currentUserId)
                }
                val canViewPosts = isMe || followStatus == FollowStatus.FOLLOWING || !profile.isPrivate
                val posts = if (canViewPosts) feedRepository.fetchProfilePosts(profile.id) else emptyList()
                val incomingRequests = if (isMe) {
                    profileRepository.fetchIncomingFollowRequests(currentUserId)
                } else {
                    emptyList()
                }

                _uiState.update {
                    ProfileUiState(
                        currentUserId = currentUserId,
                        profile = profile,
                        counts = counts,
                        followStatus = followStatus,
                        incomingRequests = incomingRequests,
                        posts = posts,
                        isLoading = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Nao foi possivel carregar o perfil")
                }
            }
        }
    }

    fun followOrRequest() {
        val state = _uiState.value
        val currentUserId = state.currentUserId ?: return
        val profile = state.profile ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isBusy = true, errorMessage = null) }
            try {
                val nextStatus = profileRepository.sendFollowOrRequest(currentUserId, profile)
                _uiState.update {
                    it.copy(
                        followStatus = nextStatus,
                        counts = if (nextStatus == FollowStatus.FOLLOWING) {
                            it.counts.copy(followers = it.counts.followers + 1)
                        } else {
                            it.counts
                        },
                        isBusy = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isBusy = false, errorMessage = e.message ?: "Nao foi possivel seguir")
                }
            }
        }
    }

    fun cancelRequest() {
        val state = _uiState.value
        val currentUserId = state.currentUserId ?: return
        val profile = state.profile ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isBusy = true, errorMessage = null) }
            try {
                profileRepository.cancelFollowRequest(currentUserId, profile.id)
                _uiState.update { it.copy(followStatus = FollowStatus.NONE, isBusy = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isBusy = false, errorMessage = e.message ?: "Nao foi possivel cancelar a solicitacao")
                }
            }
        }
    }

    fun unfollow() {
        val state = _uiState.value
        val currentUserId = state.currentUserId ?: return
        val profile = state.profile ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isBusy = true, errorMessage = null) }
            try {
                profileRepository.unfollowProfile(currentUserId, profile.id)
                _uiState.update {
                    it.copy(
                        followStatus = FollowStatus.NONE,
                        counts = it.counts.copy(followers = (it.counts.followers - 1).coerceAtLeast(0)),
                        isBusy = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isBusy = false, errorMessage = e.message ?: "Nao foi possivel deixar de seguir")
                }
            }
        }
    }

    fun acceptRequest(requesterId: String) {
        val currentUserId = _uiState.value.currentUserId ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isBusy = true, errorMessage = null) }
            try {
                profileRepository.acceptFollowRequest(currentUserId, requesterId)
                _uiState.update {
                    it.copy(
                        incomingRequests = it.incomingRequests.filterNot { request -> request.requesterId == requesterId },
                        counts = it.counts.copy(followers = it.counts.followers + 1),
                        isBusy = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isBusy = false, errorMessage = e.message ?: "Nao foi possivel aceitar a solicitacao")
                }
            }
        }
    }

    fun declineRequest(requesterId: String) {
        val currentUserId = _uiState.value.currentUserId ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isBusy = true, errorMessage = null) }
            try {
                profileRepository.declineFollowRequest(currentUserId, requesterId)
                _uiState.update {
                    it.copy(
                        incomingRequests = it.incomingRequests.filterNot { request -> request.requesterId == requesterId },
                        isBusy = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isBusy = false, errorMessage = e.message ?: "Nao foi possivel recusar a solicitacao")
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
                _uiState.update { state ->
                    state.copy(
                        posts = state.posts.filterNot { it.id == postId },
                        counts = state.counts.copy(posts = (state.counts.posts - 1).coerceAtLeast(0)),
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(errorMessage = e.message ?: "Nao foi possivel apagar o post") }
            }
        }
    }

    private fun replacePost(post: FeedPost) {
        _uiState.update { state -> state.copy(posts = state.posts.map { if (it.id == post.id) post else it }) }
    }
}
