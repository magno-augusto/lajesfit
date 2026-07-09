package com.lajesfit.android.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lajesfit.android.feature.goals.GoalsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.auth.user.UserInfo
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

/**
 * Estado unico do gate de navegacao - ver android/specs/M2-onboarding.md. needsRealEmail e'
 * sincrono (vem do JWT em sessionStatus), mas idrProfile exige uma consulta de rede; por isso o
 * gate inteiro e' resolvido aqui numa unica fonte da verdade, em vez de duplicado em MainActivity/
 * LajesFitNavGraph/RequireEmailScreen.
 */
sealed interface GateState {
    data object Loading : GateState
    data object Unauthenticated : GateState
    data object NeedsRealEmail : GateState
    data object NeedsOnboarding : GateState
    data object Ready : GateState
}

@HiltViewModel
class AuthGateViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val goalsRepository: GoalsRepository,
) : ViewModel() {

    val sessionStatus: StateFlow<SessionStatus> = authRepository.sessionStatus

    val gateState: StateFlow<GateState> = authRepository.sessionStatus
        .map { status -> resolveGateState(status) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), GateState.Loading)

    fun currentUser(): UserInfo? = authRepository.currentUser()

    fun needsRealEmail(user: UserInfo): Boolean = authRepository.needsRealEmail(user)

    suspend fun hasIdrProfile(): Boolean = goalsRepository.getIdrProfile() != null

    private suspend fun resolveGateState(status: SessionStatus): GateState = when (status) {
        is SessionStatus.Initializing -> GateState.Loading
        is SessionStatus.NotAuthenticated, is SessionStatus.RefreshFailure -> GateState.Unauthenticated
        is SessionStatus.Authenticated -> {
            val user = status.session.user
            when {
                user == null -> GateState.Unauthenticated
                authRepository.needsRealEmail(user) -> GateState.NeedsRealEmail
                !hasIdrProfile() -> GateState.NeedsOnboarding
                else -> GateState.Ready
            }
        }
    }
}
