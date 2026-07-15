import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    // org.jetbrains.kotlin.android nao e' mais aplicado: AGP 9+ tem suporte a Kotlin
    // embutido (ver erro de build real "no longer required for Kotlin support since AGP 9.0").
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

// SUPABASE_ANON_KEY/GOOGLE_WEB_CLIENT_ID sao segredos de config local, nunca hardcoded no
// repo (mesmo padrao do .env do web) - ver android/CLAUDE.md e android/specs/M1-supabase-auth.md.
val localProperties = Properties().apply {
    val localPropertiesFile = rootProject.file("local.properties")
    if (localPropertiesFile.exists()) {
        localPropertiesFile.inputStream().use { load(it) }
    }
}

// Credenciais de assinatura do release: lidas do local.properties (gitignored),
// nunca hardcoded no repo. Se ausentes, o release fica sem signingConfig (ex.:
// CI sem os segredos) e o assembleDebug continua funcionando normalmente.
val keystorePath = localProperties.getProperty("LAJESFIT_KEYSTORE_PATH")
val keystorePassword = localProperties.getProperty("LAJESFIT_KEYSTORE_PASSWORD")

android {
    namespace = "com.lajesfit.android"
    compileSdk = 36

    defaultConfig {
        // applicationId = identidade na Play. Assume a ficha da TWA (com.lajesfit.app)
        // para substitui-la; o namespace/pacote Kotlin continua com.lajesfit.android.
        // ATENCAO: versionCode DEVE ser maior que o publicado da TWA na Play — confira
        // no Play Console e ajuste se a TWA ja passou de 1.
        applicationId = "com.lajesfit.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 3
        versionName = "0.1.1"

        buildConfigField(
            "String",
            "SUPABASE_URL",
            "\"${localProperties.getProperty("SUPABASE_URL", "")}\"",
        )
        buildConfigField(
            "String",
            "SUPABASE_ANON_KEY",
            "\"${localProperties.getProperty("SUPABASE_ANON_KEY", "")}\"",
        )
        buildConfigField(
            "String",
            "GOOGLE_WEB_CLIENT_ID",
            "\"${localProperties.getProperty("GOOGLE_WEB_CLIENT_ID", "")}\"",
        )
    }

    signingConfigs {
        // Assina o release com a MESMA chave (upload key) da TWA, para poder
        // atualizar a ficha com.lajesfit.app. Store e key password sao iguais
        // (keystore PKCS12). So cria se o local.properties tiver a chave.
        if (keystorePath != null) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = keystorePassword
                keyAlias = "lajesfit"
                keyPassword = keystorePassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (keystorePath != null) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
        debug {
            // Sufixo para o build local (assinado com a debug key) conviver no
            // device com o release com.lajesfit.app publicado no teste interno da
            // Play, sem conflito de assinatura. Instala como com.lajesfit.app.debug,
            // com icone proprio. O redirect de OAuth usa scheme fixo lajesfit://auth
            // (SupabaseModule/manifest), independente do applicationId, entao o login
            // segue funcionando. Ainda nao ha FCM/google-services que exija match de
            // package.
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    sourceSets["main"].kotlin.srcDirs("src/main/kotlin")
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.navigation.compose)

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)

    implementation(platform(libs.supabase.bom))
    implementation(libs.supabase.auth.kt)
    implementation(libs.supabase.postgrest.kt)
    implementation(libs.supabase.storage.kt)
    implementation(libs.ktor.client.okhttp)
    implementation(libs.ktor.client.content.negotiation)
    implementation(libs.ktor.serialization.kotlinx.json)
    implementation(libs.kotlinx.serialization.json)

    implementation(libs.androidx.datastore.preferences)

    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services.auth)
    implementation(libs.googleid)

    implementation(libs.coil.compose)
    implementation(libs.coil.network.okhttp)

    implementation(libs.androidx.camera.core)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    implementation(libs.mlkit.barcode.scanning)
    implementation(libs.androidx.health.connect.client)

    debugImplementation(libs.androidx.compose.ui.tooling)
}
