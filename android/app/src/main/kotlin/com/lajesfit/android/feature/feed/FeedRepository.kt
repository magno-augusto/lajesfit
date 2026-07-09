package com.lajesfit.android.feature.feed

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.exception.PostgrestRestException
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

enum class PostType { GENERAL, WORKOUT, DIET }

data class ProfileSummary(
    val id: String,
    val username: String,
    val displayName: String?,
    val avatarUrl: String?,
)

data class WorkoutSummary(
    val id: String,
    val activityType: String?,
    val distanceMeters: Double?,
    val durationSeconds: Int?,
    val calories: Int?,
    val title: String?,
    val stravaActivityId: Long?,
)

data class FeedPost(
    val id: String,
    val content: String,
    val mediaUrl: String?,
    val createdAt: String,
    val userId: String,
    val workoutId: String?,
    val profile: ProfileSummary,
    val workout: WorkoutSummary?,
    val likesCount: Int,
    val commentsCount: Int,
    val likedByMe: Boolean,
    val type: PostType,
)

@Serializable
private data class PostRow(
    val id: String,
    val content: String,
    @SerialName("media_url") val mediaUrl: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("user_id") val userId: String,
    @SerialName("workout_id") val workoutId: String? = null,
)

@Serializable
private data class WorkoutRow(
    val id: String,
    @SerialName("activity_type") val activityType: String? = null,
    @SerialName("distance_meters") val distanceMeters: Double? = null,
    @SerialName("duration_seconds") val durationSeconds: Int? = null,
    val calories: Int? = null,
    val title: String? = null,
    @SerialName("strava_activity_id") val stravaActivityId: Long? = null,
) {
    fun toSummary() = WorkoutSummary(
        id = id,
        activityType = activityType,
        distanceMeters = distanceMeters,
        durationSeconds = durationSeconds,
        calories = calories,
        title = title,
        stravaActivityId = stravaActivityId,
    )
}

@Serializable
private data class PostIdRow(@SerialName("post_id") val postId: String)

@Serializable
private data class PostInsert(
    @SerialName("user_id") val userId: String,
    val content: String,
    @SerialName("media_url") val mediaUrl: String? = null,
)

@Serializable
private data class PostLikeInsert(
    @SerialName("post_id") val postId: String,
    @SerialName("user_id") val userId: String,
)

@Serializable
private data class PostViewInsert(
    @SerialName("post_id") val postId: String,
    @SerialName("user_id") val userId: String,
)

private data class HydrationData(
    val profiles: Map<String, ProfileSummary>,
    val likeCounts: Map<String, Int>,
    val commentCounts: Map<String, Int>,
    val likedByMe: Set<String>,
    val workouts: Map<String, WorkoutSummary>,
)

private val DIET_CONTENT_PREFIXES = listOf(
    "Cafe da manha registrado",
    "Almoco registrado",
    "Lanche registrado",
    "Jantar registrado",
)

class FeedException(message: String) : Exception(message)

/**
 * Porta feed-api.ts + likes-api.ts + posts-api.ts para Kotlin - ver android/specs/M3-feed.md
 * ("Comportamento do web a espelhar") para a justificativa de cada decisao, em especial a
 * hidratacao em 5 buscas paralelas (nao ha coluna agregada nem trigger de contagem no banco) e a
 * paginacao por offset via a RPC get_feed_post_ids.
 */
@Singleton
class FeedRepository @Inject constructor(
    private val supabaseClient: SupabaseClient,
) {

    fun currentUserId(): String? = supabaseClient.auth.currentUserOrNull()?.id

    suspend fun fetchFeed(offset: Int, limit: Int = FEED_PAGE_SIZE): List<FeedPost> {
        val userId = currentUserId() ?: return emptyList()

        val orderedIds = supabaseClient.postgrest
            .rpc(
                "get_feed_post_ids",
                buildJsonObject {
                    put("p_user_id", userId)
                    put("p_limit", limit)
                    put("p_offset", offset)
                },
            )
            .decodeList<PostIdRow>()
            .map { it.postId }
        if (orderedIds.isEmpty()) return emptyList()

        val rows = supabaseClient.postgrest.from("posts")
            .select(
                columns = Columns.list("id", "content", "media_url", "created_at", "user_id", "workout_id"),
            ) {
                filter { isIn("id", orderedIds) }
            }
            .decodeList<PostRow>()

        // .in() do Postgrest nao preserva ordem - reordena local pra bater com a RPC.
        val orderIndex = orderedIds.withIndex().associate { (index, id) -> id to index }
        val sortedRows = rows.sortedBy { orderIndex[it.id] ?: Int.MAX_VALUE }

        return hydrate(sortedRows, userId)
    }

    suspend fun markPostsViewed(postIds: List<String>) {
        val userId = currentUserId() ?: return
        if (postIds.isEmpty()) return
        supabaseClient.postgrest.from("post_views").upsert(
            postIds.map { PostViewInsert(postId = it, userId = userId) },
        ) {
            onConflict = "post_id,user_id"
            ignoreDuplicates = true
        }
    }

    suspend fun likePost(postId: String) {
        val userId = currentUserId() ?: return
        try {
            supabaseClient.postgrest.from("post_likes")
                .insert(PostLikeInsert(postId = postId, userId = userId))
        } catch (e: PostgrestRestException) {
            if (e.code != POSTGRES_UNIQUE_VIOLATION) throw e
        }
    }

    suspend fun unlikePost(postId: String) {
        val userId = currentUserId() ?: return
        supabaseClient.postgrest.from("post_likes").delete {
            filter {
                eq("user_id", userId)
                eq("post_id", postId)
            }
        }
    }

    suspend fun deletePost(postId: String) {
        val userId = currentUserId() ?: return
        supabaseClient.postgrest.from("posts").delete {
            filter {
                eq("id", postId)
                eq("user_id", userId)
            }
        }
    }

    suspend fun createPost(content: String) {
        val userId = currentUserId() ?: throw FeedException("Sem sessao ativa")
        val trimmed = content.trim()
        if (trimmed.isEmpty()) throw FeedException("Adicione um texto para publicar")
        supabaseClient.postgrest.from("posts")
            .insert(PostInsert(userId = userId, content = trimmed))
    }

    private suspend fun hydrate(rows: List<PostRow>, currentUserId: String): List<FeedPost> {
        if (rows.isEmpty()) return emptyList()
        val postIds = rows.map { it.id }
        val userIds = rows.map { it.userId }.distinct()
        val workoutIds = rows.mapNotNull { it.workoutId }.distinct()

        val data = coroutineScope {
            val profilesDeferred = async { fetchProfileSummaries(supabaseClient, userIds) }
            val likeCountsDeferred = async { countByPostId("post_likes", postIds) }
            val commentCountsDeferred = async { countByPostId("post_comments", postIds) }
            val likedByMeDeferred = async { likedPostIds(postIds, currentUserId) }
            val workoutsDeferred = async { if (workoutIds.isEmpty()) emptyMap() else fetchWorkouts(workoutIds) }
            HydrationData(
                profiles = profilesDeferred.await(),
                likeCounts = likeCountsDeferred.await(),
                commentCounts = commentCountsDeferred.await(),
                likedByMe = likedByMeDeferred.await(),
                workouts = workoutsDeferred.await(),
            )
        }

        return rows.mapNotNull { row ->
            val profile = data.profiles[row.userId] ?: return@mapNotNull null
            FeedPost(
                id = row.id,
                content = row.content,
                mediaUrl = row.mediaUrl,
                createdAt = row.createdAt,
                userId = row.userId,
                workoutId = row.workoutId,
                profile = profile,
                workout = row.workoutId?.let { data.workouts[it] },
                likesCount = data.likeCounts[row.id] ?: 0,
                commentsCount = data.commentCounts[row.id] ?: 0,
                likedByMe = row.id in data.likedByMe,
                type = inferPostType(row.content, row.workoutId),
            )
        }
    }

    private suspend fun countByPostId(table: String, postIds: List<String>): Map<String, Int> {
        if (postIds.isEmpty()) return emptyMap()
        return supabaseClient.postgrest.from(table)
            .select(columns = Columns.list("post_id")) {
                filter { isIn("post_id", postIds) }
            }
            .decodeList<PostIdRow>()
            .groupingBy { it.postId }
            .eachCount()
    }

    private suspend fun likedPostIds(postIds: List<String>, userId: String): Set<String> {
        if (postIds.isEmpty()) return emptySet()
        return supabaseClient.postgrest.from("post_likes")
            .select(columns = Columns.list("post_id")) {
                filter {
                    isIn("post_id", postIds)
                    eq("user_id", userId)
                }
            }
            .decodeList<PostIdRow>()
            .map { it.postId }
            .toSet()
    }

    private suspend fun fetchWorkouts(workoutIds: List<String>): Map<String, WorkoutSummary> {
        return supabaseClient.postgrest.from("workouts")
            .select(
                columns = Columns.list(
                    "id",
                    "activity_type",
                    "distance_meters",
                    "duration_seconds",
                    "calories",
                    "title",
                    "strava_activity_id",
                ),
            ) {
                filter { isIn("id", workoutIds) }
            }
            .decodeList<WorkoutRow>()
            .associate { it.id to it.toSummary() }
    }

    private fun inferPostType(content: String, workoutId: String?): PostType {
        val base = if (DIET_CONTENT_PREFIXES.any { content.startsWith(it) }) PostType.DIET else PostType.GENERAL
        return if (workoutId != null) PostType.WORKOUT else base
    }

    companion object {
        const val FEED_PAGE_SIZE = 20
        private const val POSTGRES_UNIQUE_VIOLATION = "23505"
    }
}
