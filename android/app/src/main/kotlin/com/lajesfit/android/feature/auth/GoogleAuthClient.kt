package com.lajesfit.android.feature.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.lajesfit.android.BuildConfig
import java.security.MessageDigest
import java.util.UUID

data class GoogleIdTokenResult(val idToken: String, val rawNonce: String)

/**
 * Fluxo nativo de "Entrar com Google" via Credential Manager - substitui o redirect de navegador
 * do web (loginWithGoogle, auth.ts:122-133). Exige GOOGLE_WEB_CLIENT_ID configurado em
 * local.properties (ver android/specs/M1-supabase-auth.md, pre-requisito externo). Retorna null
 * se ainda nao configurado, em vez de tentar e falhar com um erro confuso.
 */
suspend fun requestGoogleIdToken(context: Context): GoogleIdTokenResult? {
    if (BuildConfig.GOOGLE_WEB_CLIENT_ID.isBlank()) return null

    val rawNonce = UUID.randomUUID().toString()
    val hashedNonce = sha256(rawNonce)

    val googleIdOption = GetGoogleIdOption.Builder()
        .setFilterByAuthorizedAccounts(false)
        .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
        .setNonce(hashedNonce)
        .build()

    val request = GetCredentialRequest.Builder()
        .addCredentialOption(googleIdOption)
        .build()

    val credentialManager = CredentialManager.create(context)
    val response = try {
        credentialManager.getCredential(context, request)
    } catch (e: GetCredentialException) {
        throw AuthException("Nao foi possivel entrar com Google")
    }

    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(response.credential.data)
    return GoogleIdTokenResult(idToken = googleIdTokenCredential.idToken, rawNonce = rawNonce)
}

private fun sha256(value: String): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray())
    return digest.joinToString("") { "%02x".format(it) }
}
