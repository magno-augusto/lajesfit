package com.lajesfit.android.feature.auth

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.auth.user.UserInfo
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

/**
 * Estado de sessao observado pela raiz do NavHost (MainActivity/LajesFitAppRoot) para decidir
 * entre o grafo de auth e o grafo principal - ver android/specs/M1-supabase-auth.md.
 */
@HiltViewModel
class AuthGateViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    val sessionStatus: StateFlow<SessionStatus> = authRepository.sessionStatus

    fun currentUser(): UserInfo? = authRepository.currentUser()

    fun needsRealEmail(user: UserInfo): Boolean = authRepository.needsRealEmail(user)
}
