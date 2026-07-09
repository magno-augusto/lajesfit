package com.lajesfit.android.core.di

import com.lajesfit.android.BuildConfig
import com.lajesfit.android.core.data.AuthSessionStore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.storage.Storage
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.DefaultRequest
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.header
import io.ktor.serialization.kotlinx.json.json
import javax.inject.Singleton
import kotlinx.serialization.json.Json

/**
 * Mesmo projeto Supabase do app web (../src/integrations/supabase/client.ts) - mesmo banco,
 * mesmas RLS. URL/anon key vem de local.properties -> BuildConfig, nunca hardcoded (ver
 * android/specs/M1-supabase-auth.md).
 */
@Module
@InstallIn(SingletonComponent::class)
object SupabaseModule {

    @Provides
    @Singleton
    fun provideSupabaseClient(sessionStore: AuthSessionStore): SupabaseClient = createSupabaseClient(
        supabaseUrl = BuildConfig.SUPABASE_URL,
        supabaseKey = BuildConfig.SUPABASE_ANON_KEY,
    ) {
        install(Auth) {
            sessionManager = sessionStore
            // Deep link unico para recovery/signup-confirm/magic-link (ver AndroidManifest.xml);
            // o tipo de fluxo vem em UserSession.type, nao na URL.
            scheme = "lajesfit"
            host = "auth"
        }
        install(Postgrest)
        install(Storage)
    }

    @Provides
    @Singleton
    fun provideOpenFoodFactsHttpClient(): HttpClient = HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
        install(DefaultRequest) {
            header("User-Agent", "LajesFit/1.0 (https://lajesfit.vercel.app)")
        }
    }
}
