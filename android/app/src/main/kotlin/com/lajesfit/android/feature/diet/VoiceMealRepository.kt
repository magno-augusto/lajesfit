package com.lajesfit.android.feature.diet

import android.util.Log
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
private data class TranscribeResponse(val text: String = "")

@Serializable
private data class ParseMealItem(
    @SerialName("food_name") val foodName: String = "",
    val grams: Double = 0.0,
    val kcal: Double = 0.0,
    @SerialName("protein_g") val proteinG: Double = 0.0,
    @SerialName("carbs_g") val carbsG: Double = 0.0,
    @SerialName("fat_g") val fatG: Double = 0.0,
)

@Serializable
private data class ParseMealResponse(val items: List<ParseMealItem> = emptyList())

@Singleton
class VoiceMealRepository @Inject constructor(
    private val httpClient: HttpClient,
) {
    suspend fun transcribe(audioBytes: ByteArray, fileName: String): String {
        val response: HttpResponse = httpClient.submitFormWithBinaryData(
            url = "$LAJESFIT_WEB_BASE_URL/api/transcribe",
            formData = formData {
                append("audio", audioBytes, Headers.build {
                    append(HttpHeaders.ContentType, "audio/mp4")
                    append(HttpHeaders.ContentDisposition, "filename=$fileName")
                })
            },
        ) {
            header(HttpHeaders.UserAgent, "LajesFit-Android/1.0")
        }

        if (!response.status.isSuccess()) {
            val body = response.body<String>()
            Log.e("VoiceMeal", "Transcribe error ${response.status}: $body")
            throw Error("Falha ao transcrever audio")
        }

        return response.body<TranscribeResponse>().text
    }

    suspend fun parseMeal(text: String): List<MealFoodInput> {
        val response = httpClient.post("$LAJESFIT_WEB_BASE_URL/api/parse-meal") {
            contentType(ContentType.Application.Json)
            setBody(mapOf("text" to text))
        }

        if (!response.status.isSuccess()) {
            val body = response.body<String>()
            Log.e("VoiceMeal", "Parse error ${response.status}: $body")
            throw Error("Falha ao interpretar refeicao")
        }

        return response.body<ParseMealResponse>().items.map { item ->
            MealFoodInput(
                name = item.foodName,
                grams = item.grams,
                kcal = item.kcal,
                proteinG = item.proteinG,
                carbsG = item.carbsG,
                fatG = item.fatG,
            )
        }
    }

    companion object {
        private const val LAJESFIT_WEB_BASE_URL = "https://lajesfit.vercel.app"
    }
}
