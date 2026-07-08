package com.lajesfit.android.core.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import io.github.jan.supabase.auth.SessionManager
import io.github.jan.supabase.auth.user.UserSession
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

private val Context.authDataStore by preferencesDataStore(name = "auth_session")

/**
 * SessionManager do supabase-kt sustentado por DataStore, no lugar do SharedPreferences default
 * da lib - decisao ja fechada em CLAUDE.md ("DataStore para sessao/estado leve").
 */
@Singleton
class AuthSessionStore @Inject constructor(
    @ApplicationContext private val context: Context,
) : SessionManager {

    private val sessionKey = stringPreferencesKey("user_session")

    override suspend fun saveSession(session: UserSession) {
        val encoded = Json.encodeToString(UserSession.serializer(), session)
        context.authDataStore.edit { prefs -> prefs[sessionKey] = encoded }
    }

    override suspend fun loadSession(): UserSession {
        // supabase-kt 3.6.0 nao expoe uma excecao dedicada para "sem sessao" (a checagem via
        // loadSessionOrNull() do proprio SessionManager captura Exception generica).
        val encoded = context.authDataStore.data.first()[sessionKey]
            ?: throw NoSuchElementException("Nenhuma sessao salva")
        return Json.decodeFromString(UserSession.serializer(), encoded)
    }

    override suspend fun deleteSession() {
        context.authDataStore.edit { prefs -> prefs.remove(sessionKey) }
    }
}
