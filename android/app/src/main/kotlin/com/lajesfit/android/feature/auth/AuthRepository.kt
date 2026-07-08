package com.lajesfit.android.feature.auth

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.providers.builtin.IDToken
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.auth.user.UserInfo
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.rpc
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Porta 1:1 as regras de ../src/features/auth/auth.ts para Kotlin - ver
 * android/specs/M1-supabase-auth.md ("Comportamento do web a espelhar") para a justificativa de
 * cada decisao. Nao reinventa validacao nem RPCs: mesma normalizacao de username, mesma RPC
 * get_login_email, mesmo signOut() pos-cadastro.
 */
@Singleton
class AuthRepository @Inject constructor(
    private val supabaseClient: SupabaseClient,
) {

    val sessionStatus: StateFlow<SessionStatus> get() = supabaseClient.auth.sessionStatus

    fun currentUser(): UserInfo? = supabaseClient.auth.currentUserOrNull()

    /** Espelha app-shell.tsx:91-92: conta legada sem e-mail real, sem troca pendente. */
    fun needsRealEmail(user: UserInfo): Boolean =
        user.email?.endsWith(LEGACY_EMAIL_DOMAIN) == true && user.newEmail == null

    fun normalizeUsername(username: String): String =
        username.trim().lowercase().replace(NON_USERNAME_CHARS, "")

    suspend fun signUp(username: String, email: String, password: String) {
        val normalizedUsername = normalizeUsername(username)
        val cleanPassword = password.trim()
        val cleanEmail = email.trim().lowercase()

        require(normalizedUsername.isNotEmpty() && cleanPassword.isNotEmpty() && cleanEmail.isNotEmpty()) {
            "Informe usuario, e-mail e senha para criar sua conta"
        }
        require(isValidEmail(cleanEmail)) { "Informe um e-mail valido" }
        require(cleanPassword.length >= 6) { "A senha precisa ter pelo menos 6 caracteres" }

        supabaseClient.auth.signUpWith(Email) {
            this.email = cleanEmail
            this.password = cleanPassword
            this.data = buildJsonObject {
                put("username", normalizedUsername)
                put("display_name", normalizedUsername)
            }
        }
        // Cadastro nao loga automaticamente - forca o usuario a entrar explicitamente depois,
        // igual ao web (auth.ts:53).
        supabaseClient.auth.signOut()
    }

    suspend fun login(identifier: String, password: String) {
        val cleanIdentifier = identifier.trim()
        val cleanPassword = password.trim()
        require(cleanIdentifier.isNotEmpty() && cleanPassword.isNotEmpty()) {
            "Informe usuario ou e-mail e senha para entrar"
        }

        // Nomes diferentes dos campos de Email.Config de proposito: dentro do lambda de config,
        // um nome igual ao da propriedade do receiver (email/password) seria sombreado por ela -
        // this.email = email viraria um self-assign silencioso, nao a variavel de fora.
        val resolvedEmail = if (isValidEmail(cleanIdentifier)) {
            cleanIdentifier.lowercase()
        } else {
            resolveEmailForUsername(normalizeUsername(cleanIdentifier))
                ?: throw AuthException("Usuario ou senha incorretos")
        }

        try {
            supabaseClient.auth.signInWith(Email) {
                this.email = resolvedEmail
                this.password = cleanPassword
            }
        } catch (e: Exception) {
            throw AuthException("Usuario ou senha incorretos")
        }
    }

    suspend fun requestPasswordReset(username: String) {
        val normalizedUsername = normalizeUsername(username)
        require(normalizedUsername.isNotEmpty()) { "Informe seu usuario" }

        val email = resolveEmailForUsername(normalizedUsername)
            ?: throw AuthException("Nao encontramos uma conta com esse usuario")

        // redirectUrl omitido: com scheme/host configurados (SupabaseModule), o supabase-kt usa
        // o deep link do app como redirect default no Android.
        supabaseClient.auth.resetPasswordForEmail(email)
    }

    suspend fun confirmNewPassword(newPassword: String) {
        val cleanPassword = newPassword.trim()
        require(cleanPassword.length >= 6) { "A nova senha precisa ter pelo menos 6 caracteres" }
        supabaseClient.auth.updateUser { password = cleanPassword }
    }

    /** Espelha RequireEmail.tsx: troca de e-mail (nao cadastro novo), envia link de confirmacao. */
    suspend fun setRealEmail(email: String) {
        val cleanEmail = email.trim().lowercase()
        supabaseClient.auth.updateUser { this.email = cleanEmail }
    }

    suspend fun loginWithGoogleIdToken(googleIdToken: String, rawNonce: String?) {
        supabaseClient.auth.signInWith(IDToken) {
            this.idToken = googleIdToken
            this.provider = Google
            this.nonce = rawNonce
        }
    }

    suspend fun logout() {
        supabaseClient.auth.signOut()
    }

    private suspend fun resolveEmailForUsername(normalizedUsername: String): String? = try {
        supabaseClient.postgrest
            .rpc("get_login_email", buildJsonObject { put("p_username", normalizedUsername) })
            .decodeAsOrNull<String>()
    } catch (e: Exception) {
        null
    }

    private fun isValidEmail(email: String): Boolean = EMAIL_REGEX.matches(email)

    companion object {
        const val LEGACY_EMAIL_DOMAIN = "@lajesfit.local"
        private val EMAIL_REGEX = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
        private val NON_USERNAME_CHARS = Regex("[^a-z0-9_]")
    }
}

class AuthException(message: String) : Exception(message)
