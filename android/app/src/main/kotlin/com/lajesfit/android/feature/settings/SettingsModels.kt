package com.lajesfit.android.feature.settings

data class ProfileSettings(
    val username: String,
    val displayName: String,
    val bio: String?,
    val avatarUrl: String?,
    val recoveryEmail: String?,
    val isAdmin: Boolean,
    val isPrivate: Boolean,
    val notificationsEnabled: Boolean,
    val notifyLikes: Boolean,
    val notifyComments: Boolean,
    val notifyFollows: Boolean,
    val notifyChallenges: Boolean,
)
