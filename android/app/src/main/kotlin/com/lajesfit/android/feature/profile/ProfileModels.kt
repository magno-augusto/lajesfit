package com.lajesfit.android.feature.profile

data class ProfileChromeSummary(
    val id: String,
    val username: String,
    val displayName: String?,
    val avatarUrl: String?,
)

data class UserProfile(
    val id: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String?,
    val bio: String?,
    val isPrivate: Boolean,
)

data class ProfileCounts(
    val followers: Int = 0,
    val following: Int = 0,
    val workouts: Int = 0,
    val posts: Int = 0,
)

enum class FollowStatus {
    NONE,
    REQUESTED,
    FOLLOWING,
}

data class IncomingFollowRequest(
    val requesterId: String,
    val createdAt: String,
    val profile: UserProfile,
)

data class ProfileSearchResult(
    val id: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String?,
)
