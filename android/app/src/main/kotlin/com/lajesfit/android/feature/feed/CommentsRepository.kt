package com.lajesfit.android.feature.feed

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

data class PostComment(
    val id: String,
    val postId: String,
    val content: String,
    val createdAt: String,
    val profile: ProfileSummary,
)

@Serializable
private data class PostCommentRow(
    val id: String,
    @SerialName("post_id") val postId: String,
    @SerialName("user_id") val userId: String,
    val content: String,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
private data class PostCommentInsert(
    @SerialName("post_id") val postId: String,
    @SerialName("user_id") val userId: String,
    val content: String,
)

/** Porta comments-api.ts para Kotlin - ver android/specs/M3-feed.md. */
@Singleton
class CommentsRepository @Inject constructor(
    private val supabaseClient: SupabaseClient,
) {

    suspend fun fetchComments(postId: String): List<PostComment> {
        val rows = supabaseClient.postgrest.from("post_comments")
            .select(columns = Columns.list("id", "post_id", "user_id", "content", "created_at")) {
                filter { eq("post_id", postId) }
                order("created_at", Order.ASCENDING)
            }
            .decodeList<PostCommentRow>()
        if (rows.isEmpty()) return emptyList()

        val userIds = rows.map { it.userId }.distinct()
        val profiles = fetchProfileSummaries(supabaseClient, userIds)

        return rows.mapNotNull { row ->
            val profile = profiles[row.userId] ?: return@mapNotNull null
            PostComment(id = row.id, postId = row.postId, content = row.content, createdAt = row.createdAt, profile = profile)
        }
    }

    suspend fun addComment(postId: String, content: String) {
        val userId = supabaseClient.auth.currentUserOrNull()?.id
            ?: throw FeedException("Sem sessao ativa")
        val trimmed = content.trim()
        if (trimmed.isEmpty()) throw FeedException("Escreva um comentario antes de enviar")
        supabaseClient.postgrest.from("post_comments")
            .insert(PostCommentInsert(postId = postId, userId = userId, content = trimmed))
    }

    suspend fun deleteComment(commentId: String) {
        val userId = supabaseClient.auth.currentUserOrNull()?.id ?: return
        supabaseClient.postgrest.from("post_comments").delete {
            filter {
                eq("id", commentId)
                eq("user_id", userId)
            }
        }
    }
}
